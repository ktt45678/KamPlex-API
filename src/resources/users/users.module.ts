import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { HttpEmailModule } from '../../common/http-email/http-email.module';
import { ImagekitModule } from '../../common/imagekit/imagekit.module';
import { User, UserSchema } from '../../schemas/user.schema';
import { UserAvatar, UserAvatarSchema } from '../../schemas/user-avatar.schema';

@Module({
  imports: [
    AuthModule,
    HttpEmailModule,
    ImagekitModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserAvatar.name, schema: UserAvatarSchema }
    ])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule { }
