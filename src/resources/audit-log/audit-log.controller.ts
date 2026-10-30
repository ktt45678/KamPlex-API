import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ErrorMessage } from '../auth';
import { RolesGuardOptions } from '../../decorators/roles-guard-options.decorator';
import { UserPermission } from '../../enums';

@ApiTags('Audit Log')
@Controller()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) { }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesGuardOptions({ permissions: [UserPermission.ADMINISTRATOR] })
  @ApiBearerAuth()
  @ApiOperation({ summary: `Find the latest audit logs (permissions: ${UserPermission.ADMINISTRATOR})` })
  @ApiUnauthorizedResponse({ description: 'You are not authorized', type: ErrorMessage })
  @ApiForbiddenResponse({ description: 'You do not have permission', type: ErrorMessage })
  findAll() {
    return this.auditLogService.findAll();
  }
}
