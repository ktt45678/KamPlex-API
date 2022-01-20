import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Role, RoleSchema } from '../../schemas/role.schema';
import { UsersModule } from '../users/users.module';
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
