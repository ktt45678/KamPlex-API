export interface ArtworkBaseRecord {
  height?: number;
  id?: number;
  image?: string;
  includesText?: boolean;
  language?: string;
  score?: number;
  thumbnail?: string;
  /**
   * Format: int64
   * @description The artwork type corresponds to the ids from the /artwork/types endpoint.
   */
  type?: number;
  width?: number;
}
