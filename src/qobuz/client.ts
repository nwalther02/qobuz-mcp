import crypto from "node:crypto";
import type {
  QobuzAlbumDetails,
  QobuzArtistDisplayName,
  QobuzArtistPage,
  QobuzSearchResponse,
  QobuzSearchResult,
  QobuzResolvedItem,
  QobuzPlaylistDetails,
  QobuzTrackDetails,
} from "./types.js";

const QOBUZ_API_BASE = "https://www.qobuz.com/api.json/0.2";

// Structured error for Qobuz API responses — lets catch blocks distinguish
// API failures (4xx with JSON body) from network/unexpected errors.
export class QobuzApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "QobuzApiError";
  }
}

export type QobuzItemType = "track" | "album" | "artist" | "playlist";

export class QobuzClient {
  private userAuthToken: string | null = null;
  private isReauthenticating = false;

  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  // Authenticate with Qobuz and store the user auth token.
  // Must be called before any API requests.
  async login(): Promise<void> {
    const passwordMd5 = crypto
      .createHash("md5")
      .update(this.password)
      .digest("hex");

    const params = new URLSearchParams({
      app_id: this.appId,
      username: this.username,
      password: passwordMd5,
      device_manufacturer_id: "qobuz-mcp",
    });

    const response = await fetch(
      `${QOBUZ_API_BASE}/user/login?${params.toString()}`,
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new QobuzApiError(
        `Login failed: ${response.statusText}`,
        response.status,
        body,
      );
    }

    const data = await response.json() as { user_auth_token?: string };

    if (!data.user_auth_token) {
      throw new QobuzApiError(
        "Login response missing user_auth_token",
        200,
        data,
      );
    }

    this.userAuthToken = data.user_auth_token;
  }

  isAuthenticated(): boolean {
    return this.userAuthToken !== null;
  }

  // Shared request method — injects auth headers on every call.
  // Handles 401 token expiry with a single re-login attempt.
  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    if (!this.userAuthToken) {
      throw new Error("Not authenticated — call login() first");
    }

    const searchParams = new URLSearchParams(params);

    const response = await fetch(
      `${QOBUZ_API_BASE}/${endpoint}?${searchParams.toString()}`,
      {
        headers: {
          "X-App-Id": this.appId,
          "X-User-Auth-Token": this.userAuthToken,
        },
      },
    );

    // Token expired — attempt one re-login then retry.
    // Guard prevents infinite loop if re-login itself returns 401.
    if (response.status === 401 && !this.isReauthenticating) {
      this.isReauthenticating = true;
      try {
        await this.login();
        return this.request<T>(endpoint, params);
      } finally {
        this.isReauthenticating = false;
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new QobuzApiError(
        `API error on ${endpoint}: ${response.statusText}`,
        response.status,
        body,
      );
    }

    return response.json() as Promise<T>;
  }

  // Search Qobuz catalog — returns normalised tracks, albums, and artists.
  async search(query: string, limit = 5): Promise<QobuzSearchResult> {
    const raw = await this.request<QobuzSearchResponse>("catalog/search", {
      query,
      limit: String(limit),
    });

    return {
      tracks: raw.tracks.items.map((t) => ({
        id: String(t.id),
        title: t.title,
        artist: t.performer?.name ?? t.album.artist.name,
        durationSeconds: t.duration,
      })),
      albums: raw.albums.items.map((a) => ({
        id: String(a.id),
        title: a.title,
        artist: a.artist.name,
      })),
      artists: raw.artists.items.map((a) => ({
        id: String(a.id),
        name: a.name,
      })),
    };
  }

  async getItem(id: string, type: QobuzItemType): Promise<QobuzResolvedItem> {
    switch (type) {
      case "track": {
        const track = await this.request<QobuzTrackDetails>("track/get", {
          track_id: id,
        });

        return {
          type: "track",
          id: String(track.id),
          title: track.title,
          artist: track.performer?.name ?? track.album.artist.name,
          albumTitle: track.album.title,
          durationSeconds: track.duration,
          shareUrl: this.buildShareUrl(type, id),
          playUrl: this.buildPlayUrl(type, id),
        };
      }
      case "album": {
        const album = await this.request<QobuzAlbumDetails>("album/get", {
          album_id: id,
        });

        return {
          type: "album",
          id: String(album.id),
          title: album.title,
          artist: album.artist.name,
          durationSeconds: album.duration,
          tracksCount: album.tracks_count,
          shareUrl: this.buildShareUrl(type, id),
          playUrl: this.buildPlayUrl(type, id),
        };
      }
      case "artist": {
        const artist = await this.request<QobuzArtistPage>("artist/page", {
          artist_id: id,
        });

        return {
          type: "artist",
          id: String(artist.id),
          name: this.getArtistDisplayName(artist.name),
          topTrackCount: artist.top_tracks?.length ?? 0,
          shareUrl: this.buildShareUrl(type, id),
          playUrl: this.buildPlayUrl(type, id),
        };
      }
      case "playlist": {
        const playlist = await this.request<QobuzPlaylistDetails>("playlist/get", {
          playlist_id: id,
        });

        return {
          type: "playlist",
          id: String(playlist.id),
          name: playlist.name,
          ownerName: playlist.owner?.name ?? null,
          durationSeconds: playlist.duration,
          tracksCount: playlist.tracks_count,
          shareUrl: this.buildShareUrl(type, id),
          playUrl: this.buildPlayUrl(type, id),
        };
      }
    }
  }

  private buildShareUrl(type: QobuzItemType, id: string): string {
    return `https://open.qobuz.com/${type}/${encodeURIComponent(id)}`;
  }

  private buildPlayUrl(type: QobuzItemType, id: string): string {
    return `https://play.qobuz.com/${type}/${encodeURIComponent(id)}`;
  }

  private getArtistDisplayName(name: string | QobuzArtistDisplayName): string {
    return typeof name === "string" ? name : name.display;
  }
}
