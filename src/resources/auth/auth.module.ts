import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

import { PermissionsModule } from '../../common/modules/permissions/permissions.module';
import { RedisCacheModule } from '../../common/modules/redis-cache/redis-cache.module';
import { Redis2ndCacheModule } from '../../common/modules/redis-2nd-cache/redis-2nd-cache.module';
import { HttpEmailModule } from '../../common/modules/http-email/http-email.module';
import { User, UserSchema } from '../../schemas';
import { UsernameExistConstraint } from '../../decorators/username-exist.decorator';
import { EmailExistConstraint } from '../../decorators/email-exist.decorator';
import { ReCaptchaConstraint } from '../../decorators/recaptcha.decorator';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    PermissionsModule,
    RedisCacheModule,
    Redis2ndCacheModule,
    HttpModule,
    HttpEmailModule,
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsernameExistConstraint,
    EmailExistConstraint,
    ReCaptchaConstraint
  ],
  exports: [
    AuthService,
    PermissionsModule,
    Redis2ndCacheModule,
    MongooseModule
  ]
})
export class AuthModule { }
