import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

import { Rating, RatingDocument } from '../../schemas/rating.schema';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { FindRatingDto } from './dto/find-rating.dto';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { MediaService } from '../media/media.service';

@Injectable()
export class RatingsService {
  constructor(@InjectModel(Rating.name) private ratingModel: Model<RatingDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private mediaService: MediaService) { }

  async create(createRatingDto: CreateRatingDto, authUser: AuthUserDto) {
    const { media, score } = createRatingDto;
    const session = await this.mongooseConnection.startSession();
    session.startTransaction();
    try {
      if (score === -1) {
        const deletedRating = await this.ratingModel.findOneAndDelete({ media: <any>media, user: <any>authUser._id }, { session }).lean();
        if (!deletedRating)
          throw new HttpException({ code: StatusCode.RATING_NOT_FOUND, message: 'Rating not found' }, HttpStatus.NOT_FOUND);
        await this.mediaService.updateMediaRating(media, -1, -deletedRating.score, session);
        await session.commitTransaction();
        return;
      }
      const rating = await this.ratingModel.findOneAndUpdate({ media: <any>media, user: <any>authUser._id },
        { score: score, date: new Date() }, { upsert: true, setDefaultsOnInsert: true, session }).lean();
      let incCount = 1;
      let incScore = score;
      if (rating) {
        incCount = 0;
        incScore -= rating.score;
      }
      const updatedMedia = await this.mediaService.updateMediaRating(media, incCount, incScore, session);
      if (!updatedMedia)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async findOne(findRatingDto: FindRatingDto, authUser: AuthUserDto) {
    if (authUser.isAnonymous)
      return;
    const { media } = findRatingDto;
    return this.ratingModel.findOne({ media: <any>media, user: <any>authUser._id }, { kind: 1, date: 1 }).lean().exec();
  }
}
