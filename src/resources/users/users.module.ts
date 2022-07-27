import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { HttpEmailModule } from '../../common/modules/http-email/http-email.module';
import { AzureBlobModule } from '../../common/modules/azure-blob/azure-blob.module';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    AzureBlobModule,
    HttpEmailModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule { }
