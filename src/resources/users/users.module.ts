import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { HttpEmailModule } from '../../common/http-email/http-email.module';
import { ImagekitModule } from '../../common/imagekit/imagekit.module';
import { UserAvatar, UserAvatarSchema } from '../../schemas/user-avatar.schema';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';

@Module({
  imports: [
    AuthModule,
    HttpEmailModule,
    ImagekitModule,
    MongooseModule.forFeature([{ name: UserAvatar.name, schema: UserAvatarSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule]
})
export class UsersModule { }
