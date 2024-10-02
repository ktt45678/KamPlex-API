import { Companies } from './companies.interface';
import { SeasonType } from './season-type.interface';

export interface SeasonBaseRecord {
  id?: number;
  image?: string;
  imageType?: number;
  lastUpdated?: string;
  name?: string;
  nameTranslations?: string[];
  number?: number;
  overviewTranslations?: string[];
  companies?: Companies;
  seriesId?: number;
  type?: SeasonType;
  year?: string;
}
