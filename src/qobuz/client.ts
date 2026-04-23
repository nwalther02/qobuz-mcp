import crypto from "node:crypto";
import type {
  QobuzSearchResponse,
  QobuzSearchResult,
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

  // To be implemented in Step 4
  async getItem(_id: string, _type: QobuzItemType): Promise<unknown> {
    throw new Error("Not implemented");
  }
}
