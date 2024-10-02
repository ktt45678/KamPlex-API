import { SeasonBaseRecord } from './season-base-record.interface';

export interface EpisodeBaseRecord {
  absoluteNumber?: number;
  aired?: string;
  airsAfterSeason?: number;
  airsBeforeEpisode?: number;
  airsBeforeSeason?: number;
  /** @description season, midseason, or series */
  finaleType?: string;
  id?: number;
  image?: string;
  imageType?: number | null;
  isMovie?: number;
  lastUpdated?: string;
  linkedMovie?: number;
  name?: string;
  nameTranslations?: string[];
  number?: number;
  overview?: string;
  overviewTranslations?: string[];
  runtime?: number | null;
  seasonNumber?: number;
  seasons?: SeasonBaseRecord[];
  seriesId?: number;
  seasonName?: string;
  year?: string;
}
