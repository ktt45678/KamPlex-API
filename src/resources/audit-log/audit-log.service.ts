import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';
import { createSnowFlakeIdAsync } from '../../utils';

@Injectable()
export class AuditLogService {
  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>) { }

  findAll() {
    return this.auditLogModel.find().lean().exec();
  }

  async createLog(userId: string, targetId: string, targetRef: string, type: number) {
    const log = new this.auditLogModel();
    log._id = await createSnowFlakeIdAsync();
    log.user = <any>userId;
    log.target = targetId;
    log.targetRef = targetRef;
    log.type = type;
    await log.save();
  }
}
