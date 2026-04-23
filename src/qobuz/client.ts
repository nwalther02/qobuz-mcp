// Qobuz API client — stub for Step 1
// Authentication and request logic will be implemented in Step 2

export type QobuzItemType = "track" | "album" | "artist" | "playlist";

export class QobuzClient {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  // Placeholder — to be implemented in Step 2
  async search(_query: string): Promise<unknown> {
    throw new Error("Not implemented");
  }

  async getItem(_id: string, _type: QobuzItemType): Promise<unknown> {
    throw new Error("Not implemented");
  }
}
