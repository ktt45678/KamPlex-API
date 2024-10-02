import { AwardBaseRecord } from './award-base-record.interface';
import { AwardNomineeBaseRecord } from './award-nominee-base-record.interface';
import { Character } from './character.interface';
import { Company } from './company.interface';
import { ContentRating } from './content-rating.interface';
import { RemoteID } from './remote-id.interface';
import { SeasonBaseRecord } from './season-base-record.interface';
import { TagOption } from './tag-option.interface';
import { Trailer } from './trailer.interface';
import { TranslationExtended } from './translation-extended.interface';

export interface EpisodeExtendedRecord {
  aired?: string;
  airsAfterSeason?: number;
  airsBeforeEpisode?: number;
  airsBeforeSeason?: number;
  awards?: AwardBaseRecord[];
  characters?: Character[];
  companies?: Company[];
  contentRatings?: ContentRating[];
  /** @description season, midseason, or series */
  finaleType?: string;
  /** Format: int64 */
  id?: number;
  image?: string;
  imageType?: number | null;
  /** Format: int64 */
  isMovie?: number;
  lastUpdated?: string;
  linkedMovie?: number;
  name?: string;
  nameTranslations?: string[];
  networks?: Company[];
  nominations?: AwardNomineeBaseRecord[];
  number?: number;
  overview?: string;
  overviewTranslations?: string[];
  productionCode?: string;
  remoteIds?: RemoteID[];
  runtime?: number | null;
  seasonNumber?: number;
  seasons?: SeasonBaseRecord[];
  /** Format: int64 */
  seriesId?: number;
  studios?: Company[];
  tagOptions?: TagOption[];
  trailers?: Trailer[];
  translations?: TranslationExtended;
  year?: string;
}
