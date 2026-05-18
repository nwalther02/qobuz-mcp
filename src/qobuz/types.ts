// Minimal Qobuz API response types — only fields we actually use.
// Extend as new endpoints are implemented.

export interface QobuzArtistSummary {
  id: number;
  name: string;
}

export interface QobuzArtistDisplayName {
  display: string;
}

export interface QobuzAlbumSummary {
  id: number | string;
  title: string;
  artist: QobuzArtistSummary;
}

export interface QobuzTrackItem {
  id: number;
  title: string;
  performer: QobuzArtistSummary | null;  // null for some classical/licensed tracks
  album: QobuzAlbumSummary;
  duration: number;
}

export interface QobuzAlbumItem {
  id: number;
  title: string;
  artist: QobuzArtistSummary;
}

export interface QobuzArtistItem {
  id: number;
  name: string;
}

export interface QobuzTrackDetails extends QobuzTrackItem {
  album: QobuzAlbumSummary;
}

export interface QobuzAlbumDetails {
  id: number | string;
  title: string;
  artist: QobuzArtistSummary;
  duration: number;
  tracks_count: number;
}

export interface QobuzArtistPage {
  id: number;
  name: string | QobuzArtistDisplayName;
  top_tracks?: Array<{ id: number; title: string }>;
}

export interface QobuzPlaylistDetails {
  id: number | string;
  name: string;
  owner?: {
    id: number;
    name: string;
  } | null;
  duration: number;
  tracks_count: number;
}

export interface QobuzSearchResponse {
  tracks: { items: QobuzTrackItem[]; total: number };
  albums: { items: QobuzAlbumItem[]; total: number };
  artists: { items: QobuzArtistItem[]; total: number };
}

// Normalised result returned by QobuzClient.search()
export interface QobuzSearchResult {
  tracks: Array<{ id: string; title: string; artist: string; durationSeconds: number }>;
  albums: Array<{ id: string; title: string; artist: string }>;
  artists: Array<{ id: string; name: string }>;
}

export type QobuzResolvedItem =
  | {
      type: "track";
      id: string;
      title: string;
      artist: string;
      albumTitle: string;
      durationSeconds: number;
      shareUrl: string;
      playUrl: string;
    }
  | {
      type: "album";
      id: string;
      title: string;
      artist: string;
      durationSeconds: number;
      tracksCount: number;
      shareUrl: string;
      playUrl: string;
    }
  | {
      type: "artist";
      id: string;
      name: string;
      topTrackCount: number;
      shareUrl: string;
      playUrl: string;
    }
  | {
      type: "playlist";
      id: string;
      name: string;
      ownerName: string | null;
      durationSeconds: number;
      tracksCount: number;
      shareUrl: string;
      playUrl: string;
    };
