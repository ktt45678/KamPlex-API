import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { Role, RoleSchema } from '../../schemas/role.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    AuthModule,
    SettingsModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }])
  ],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule { }
