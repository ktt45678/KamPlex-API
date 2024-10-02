import { ArtworkStatus } from './artwork-status.interface';
import { TagOption } from './tag-option.interface';

export interface ArtworkExtendedRecord {
  episodeId?: number;
  height?: number;
  id?: number;
  image?: string;
  includesText?: boolean;
  language?: string;
  movieId?: number;
  networkId?: number;
  peopleId?: number;
  score?: number;
  seasonId?: number;
  seriesId?: number;
  seriesPeopleId?: number;
  status?: ArtworkStatus;
  tagOptions?: TagOption[];
  thumbnail?: string;
  thumbnailHeight?: number;
  thumbnailWidth?: number;
  /**
   * Format: int64
   * @description The artwork type corresponds to the ids from the /artwork/types endpoint.
   */
  type?: number;
  updatedAt?: number;
  width?: number;
}
