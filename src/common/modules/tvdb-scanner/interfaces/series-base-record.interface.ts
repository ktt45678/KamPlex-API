import { Alias } from './alias.interface';
import { EpisodeBaseRecord } from './episode-base-record.interface';
import { Status } from './status.interface';

export interface SeriesBaseRecord {
  aliases?: Alias[];
  averageRuntime?: number | null;
  country?: string;
  defaultSeasonType?: number;
  episodes?: EpisodeBaseRecord[];
  firstAired?: string;
  id?: number;
  image?: string;
  isOrderRandomized?: boolean;
  lastAired?: string;
  lastUpdated?: string;
  name?: string;
  nameTranslations?: string[];
  nextAired?: string;
  originalCountry?: string;
  originalLanguage?: string;
  overviewTranslations?: string[];
  score?: number;
  slug?: string;
  status?: Status;
  year?: string;
}
