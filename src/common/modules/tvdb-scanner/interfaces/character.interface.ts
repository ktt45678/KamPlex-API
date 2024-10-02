import { Alias } from './alias.interface';
import { RecordInfo } from './record-info.interface';
import { TagOption } from './tag-option.interface';

export interface Character {
  aliases?: Alias[];
  episode?: RecordInfo;
  episodeId?: number | null;
  id?: number;
  image?: string;
  isFeatured?: boolean;
  movieId?: number | null;
  movie?: RecordInfo;
  name?: string;
  nameTranslations?: string[];
  overviewTranslations?: string[];
  peopleId?: number;
  personImgURL?: string;
  peopleType?: string;
  seriesId?: number | null;
  series?: RecordInfo;
  sort?: number;
  tagOptions?: TagOption[];
  type?: number;
  url?: string;
  personName?: string;
}
