import { Document } from 'mongoose';
import { get } from 'lodash';

import { AuditLogChange } from '../resources/audit-log';
import { TrackableDoc } from '../schemas';

export class AuditLogBuilder {
  user: bigint;
  target: bigint;
  targetRef: string;
  type: number;
  changes: AuditLogChange[];

  constructor(userId: bigint, targetId: bigint, targetRef: string, type: number, changes: AuditLogChange[] = []) {
    this.user = userId;
    this.target = targetId;
    this.targetRef = targetRef;
    this.type = type;
    this.changes = changes;
  }

  appendChange(key: string, newValue?: string | number | boolean | bigint, oldValue?: string | number | boolean | bigint) {
    this.changes.push({ key, newValue, oldValue });
  }

  getChangesFrom<T extends Document & TrackableDoc<T & any>>(doc: T, exclusions: string[] = []) {
    const exclusedFields = ['_id', ...exclusions];
    const modifiedPaths = this.resolveModifiedPaths(doc.modifiedPaths());
    const plainDoc = doc.toObject();
    for (let i = 0; i < modifiedPaths.length; i++) {
      const path = modifiedPaths[i];
      if (exclusedFields.includes(path)) continue;
      const oldValue = get(doc._original, path);
      const newValue = get(plainDoc, path);
      this.resolveValue(path, oldValue, newValue);
    }
  }

  private resolveModifiedPaths(paths: string[]) {
    return paths.filter((val) => {
      return !paths.some((v) => val !== v && v.startsWith(val + '.'))
    });
  }

  private resolveValue(path: string, oldValue: any, newValue: any, isDeep = false) {
    if (Array.isArray(newValue)) {
      const totalValues = Math.max(newValue.length, oldValue?.length);
      for (let i = 0; i < totalValues; i++) {
        this.resolveValue(`${path}[${i}]`, oldValue?.[i], newValue[i], true);
      }
    }
    else if (typeof newValue === 'object') {
      for (const key in newValue) {
        this.resolveValue(`${path}.${key}`, oldValue?.[key], newValue[key], true);
      }
    } else {
      if (isDeep && newValue === oldValue)
        return;
      this.changes.push({ key: path, newValue, oldValue })
    }
  }
}
