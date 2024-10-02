import { Alias } from './alias.interface';
import { Status } from './status.interface';

export interface MovieBaseRecord {
  aliases?: Alias[];
  id?: number;
  image?: string;
  lastUpdated?: string;
  name?: string;
  nameTranslations?: string[];
  overviewTranslations?: string[];
  score?: number;
  slug?: string;
  status?: Status;
  runtime?: number | null;
  year?: string;
}
