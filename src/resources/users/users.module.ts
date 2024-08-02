import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { HttpEmailModule } from '../../common/modules/http-email/http-email.module';
import { CloudflareR2Module } from '../../common/modules/cloudflare-r2';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    CloudflareR2Module,
    HttpEmailModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule { }
