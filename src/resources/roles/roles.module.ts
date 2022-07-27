import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Role, RoleSchema } from '../../schemas';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    UsersModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule { }
