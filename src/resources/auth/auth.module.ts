import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { PermissionsModule } from '../../common/permissions/permissions.module';
import { RedisCacheModule } from '../../common/redis-cache/redis-cache.module';
import { Redis2ndCacheModule } from '../../common/redis-2nd-cache/redis-2nd-cache.module';
import { HttpEmailModule } from '../../common/http-email/http-email.module';
import { User, UserSchema } from '../../schemas/user.schema';
import { UsernameExistConstraint } from '../../decorators/username-exist.decorator';
import { EmailExistConstraint } from '../../decorators/email-exist.decorator';
import { SettingsModule } from '../settings/settings.module';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';

@Module({
  imports: [
    forwardRef(() => SettingsModule),
    PermissionsModule,
    RedisCacheModule,
    Redis2ndCacheModule,
    HttpEmailModule,
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsernameExistConstraint,
    EmailExistConstraint
  ],
  exports: [
    AuthService,
    PermissionsModule,
    SettingsModule,
    MongooseModule
  ]
})
export class AuthModule { }
