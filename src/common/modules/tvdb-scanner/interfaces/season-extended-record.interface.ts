import { ArtworkBaseRecord } from './artwork-base-record.interface';
import { Companies } from './companies.interface';
import { EpisodeBaseRecord } from './episode-base-record.interface';
import { SeasonType } from './season-type.interface';
import { TagOption } from './tag-option.interface';
import { Trailer } from './trailer.interface';
import { TranslationExtended } from './translation-extended.interface';

export interface SeasonExtendedRecord {
  artwork?: ArtworkBaseRecord[];
  companies?: Companies;
  episodes?: EpisodeBaseRecord[];
  id?: number;
  image?: string;
  imageType?: number;
  lastUpdated?: string;
  name?: string;
  nameTranslations?: string[];
  number?: number;
  overviewTranslations?: string[];
  seriesId?: number;
  trailers?: Trailer[];
  type?: SeasonType;
  tagOptions?: TagOption[];
  translations?: TranslationExtended;
  year?: string;
};
