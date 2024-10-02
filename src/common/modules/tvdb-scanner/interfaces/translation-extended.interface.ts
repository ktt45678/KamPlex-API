import { Translation } from './translation.interface';

export interface TranslationExtended {
  nameTranslations?: Translation[];
  overviewTranslations?: Translation[];
  alias?: string[];
}
