import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuditLog, AuditLogDocument } from '../../schemas';
import { MongooseConnection } from '../../enums';
import { AuditLogBuilder, createSnowFlakeId } from '../../utils';

@Injectable()
export class AuditLogService {
  constructor(@InjectModel(AuditLog.name, MongooseConnection.DATABASE_B) private auditLogModel: Model<AuditLogDocument>) { }

  findAll() {
    return this.auditLogModel.find().sort({ _id: -1 }).limit(50).lean().exec();
  }

  async createLog(userId: bigint, targetId: bigint, targetRef: string, type: number) {
    const log = new this.auditLogModel();
    log._id = await createSnowFlakeId();
    log.user = <any>userId;
    log.target = targetId;
    log.targetRef = targetRef;
    log.type = type;
    await this.auditLogModel.create(log);
  }

  async createManyLogs(userId: bigint, targetIds: bigint[], targetRef: string, type: number) {
    const logs = [];
    for (let i = 0; i < targetIds.length; i++) {
      const log = new this.auditLogModel();
      log._id = await createSnowFlakeId();
      log.user = <any>userId;
      log.target = targetIds[i];
      log.targetRef = targetRef;
      log.type = type;
      logs.push(log);
    };
    await this.auditLogModel.insertMany(logs, { lean: true });
  }

  async createLogFromBuilder(builder: AuditLogBuilder) {
    const log = new this.auditLogModel();
    log._id = await createSnowFlakeId();
    log.user = <any>builder.user;
    log.target = builder.target;
    log.targetRef = builder.targetRef;
    log.type = builder.type;
    log.changes.push(...builder.changes);
    await this.auditLogModel.create(log);
  }

  async createManyLogsFromBuilder(builders: AuditLogBuilder[]) {
    const logs = [];
    for (let i = 0; i < builders.length; i++) {
      const builder = builders[i];
      const log = new this.auditLogModel();
      log._id = await createSnowFlakeId();
      log.user = <any>builder.user;
      log.target = builder.target;
      log.targetRef = builder.targetRef;
      log.type = builder.type;
      log.changes.push(...builder.changes);
      logs.push(log);
    }
    await this.auditLogModel.insertMany(logs, { lean: true });
  }
}
