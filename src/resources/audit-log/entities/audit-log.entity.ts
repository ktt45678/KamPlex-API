import { User } from '../../users';
import { AuditLogChange } from './audit-log-change.entity';

export class AuditLog {
  _id: string;

  user: User;

  target: string;

  targetRef: string;

  type: number;

  changes: AuditLogChange[];

  createdAt: Date;
}
