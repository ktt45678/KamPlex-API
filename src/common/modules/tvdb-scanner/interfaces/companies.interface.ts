import { Company } from './company.interface';

export interface Companies {
  studio?: Company[];
  network?: Company[];
  production?: Company[];
  distributor?: Company[];
  special_effects?: Company[];
}
