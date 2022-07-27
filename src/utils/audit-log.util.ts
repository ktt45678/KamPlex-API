import { AuditLogChange } from '../resources/audit-log';

export class AuditLogBuilder {
  user: string;
  target: string;
  targetRef: string;
  type: number;
  changes: AuditLogChange[];

  constructor(userId: string, targetId: string, targetRef: string, type: number, changes: AuditLogChange[] = []) {
    this.user = userId;
    this.target = targetId;
    this.targetRef = targetRef;
    this.type = type;
    this.changes = changes;
  }

  appendChange(key: string, newValue?: string | number | boolean, oldValue?: string | number | boolean) {
    this.changes.push({ key, newValue, oldValue });
  }
}