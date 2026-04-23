// Minimal Qobuz API response types — only fields we actually use.
// Extend as new endpoints are implemented.

export interface QobuzArtistSummary {
  id: number;
  name: string;
}

export interface QobuzAlbumSummary {
  id: number;
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
