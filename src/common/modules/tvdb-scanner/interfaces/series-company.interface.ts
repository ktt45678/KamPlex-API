import { CompanyType } from './company-type.interface';
import { Company } from './company.interface';

export interface SeriesCompany extends Company {
  companyType: CompanyType;
}
