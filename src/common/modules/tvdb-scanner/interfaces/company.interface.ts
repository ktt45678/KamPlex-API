import { Alias } from './alias.interface';
import { ParentCompany } from './parent-company.interface';
import { TagOption } from './tag-option.interface';

export interface Company {
  activeDate?: string;
  aliases?: Alias[];
  country?: string;
  id?: number;
  inactiveDate?: string;
  name?: string;
  nameTranslations?: string[];
  overviewTranslations?: string[];
  primaryCompanyType?: number | null;
  slug?: string;
  parentCompany?: ParentCompany;
  tagOptions?: TagOption[];
}
