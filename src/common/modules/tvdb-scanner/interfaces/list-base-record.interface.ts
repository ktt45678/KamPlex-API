import { Alias } from './alias.interface';
import { RemoteID } from './remote-id.interface';
import { TagOption } from './tag-option.interface';

export interface ListBaseRecord {
  aliases?: Alias[];
  id?: number;
  image?: string;
  imageIsFallback?: boolean;
  isOfficial?: boolean;
  name?: string;
  nameTranslations?: string[];
  overview?: string;
  overviewTranslations?: string[];
  remoteIds?: RemoteID[];
  tags?: TagOption[];
  score?: number;
  url?: string;
}
