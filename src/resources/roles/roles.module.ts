import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MongooseCounterModule } from '../../common/mongoose-counter/mongoose-counter.module';
import { Role, RoleSchema } from '../../schemas/role.schema';
import { UsersModule } from '../users/users.module';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseCounterModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule { }
