import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { RedisCacheModule } from '../../common/redis-cache/redis-cache.module';
import { HttpEmailModule } from '../../common/http-email/http-email.module';
import { User, UserSchema } from '../../schemas/user.schema';
import { UsernameExistConstraint } from '../../decorators/username-exist.decorator';
import { EmailExistConstraint } from '../../decorators/email-exist.decorator';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RedisCacheModule,
    HttpEmailModule,
    JwtModule.register({})
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsernameExistConstraint,
    EmailExistConstraint
  ],
  exports: [AuthService]
})
export class AuthModule { }
