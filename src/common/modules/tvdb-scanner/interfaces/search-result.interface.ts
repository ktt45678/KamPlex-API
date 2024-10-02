import { RemoteID } from './remote-id.interface';
import { TranslationSimple } from './translation-simple.interface';

export interface SearchResult {
  id: string;
  aliases?: string[];
  companies?: string[];
  companyType?: string;
  country?: string;
  director?: string;
  first_air_time?: string;
  genres?: string[];
  image_url?: string;
  name?: string;
  is_official?: boolean;
  name_translated?: string;
  network?: string;
  objectID?: string;
  officialList?: string;
  overview: string;
  overviews?: TranslationSimple;
  overview_translated?: string[];
  poster?: string;
  posters?: string[];
  primary_language?: string;
  remote_ids?: RemoteID;
  status?: string;
  slug?: string;
  studios?: string[];
  title: string;
  thumbnail?: string;
  translations?: TranslationSimple;
  translationsWithLang?: string[];
  tvdb_id?: string;
  type: string;
  year: string;
}
