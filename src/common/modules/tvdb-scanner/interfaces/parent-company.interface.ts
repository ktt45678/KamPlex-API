import { CompanyRelationShip } from './company-relation-ship.interface';

export interface ParentCompany {
  id?: number | null;
  name?: string;
  relation?: CompanyRelationShip;
}
