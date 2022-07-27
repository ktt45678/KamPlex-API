import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';

@ApiTags('Audit Log')
@Controller()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) { }

  @Get()
  findAll() {
    return this.auditLogService.findAll();
  }
}
