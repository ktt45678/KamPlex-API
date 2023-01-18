import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuditLog, AuditLogSchema } from '../../schemas';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }], MongooseConnection.DATABASE_B)],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService]
})
export class AuditLogModule { }
