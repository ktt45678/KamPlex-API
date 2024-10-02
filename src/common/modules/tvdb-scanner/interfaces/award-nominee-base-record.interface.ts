import { Character } from './character.interface';
import { EpisodeBaseRecord } from './episode-base-record.interface';
import { MovieBaseRecord } from './movie-base-record.interface';
import { SeriesBaseRecord } from './series-base-record.interface';

export interface AwardNomineeBaseRecord {
  character?: Character;
  details?: string;
  episode?: EpisodeBaseRecord;
  id?: number;
  isWinner?: boolean;
  movie?: MovieBaseRecord;
  series?: SeriesBaseRecord;
  year?: string;
  category?: string;
  name?: string;
}
