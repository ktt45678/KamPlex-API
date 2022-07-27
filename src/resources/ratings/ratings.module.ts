import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Rating, RatingSchema } from '../../schemas';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [
    AuthModule,
    MediaModule,
    MongooseModule.forFeature([{ name: Rating.name, schema: RatingSchema }], MongooseConnection.DATABASE_A)
  ],
  controllers: [RatingsController],
  providers: [RatingsService]
})
export class RatingsModule { }
