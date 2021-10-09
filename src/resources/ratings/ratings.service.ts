import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

import { Rating, RatingDocument } from '../../schemas/rating.schema';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { FindRatingDto } from './dto/find-rating.dto';
import { RatingKind } from '../../enums/rating-kind.enum';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { MediaService } from '../media/media.service';

@Injectable()
export class RatingsService {
  constructor(@InjectModel(Rating.name) private ratingModel: Model<RatingDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private mediaService: MediaService) { }

  async create(createRatingDto: CreateRatingDto, authUser: AuthUserDto) {
    const { media, kind } = createRatingDto;
    let likes = 0;
    let dislikes = 0;
    const session = await this.mongooseConnection.startSession();
    session.startTransaction();
    try {
      if (kind === RatingKind.NONE) {
        const deletedRating = await this.ratingModel.findOneAndDelete({ media: <any>media, user: <any>authUser._id }, { session }).lean();
        if (!deletedRating)
          throw new HttpException({ code: StatusCode.RATING_NOT_FOUND, message: 'Rating not found' }, HttpStatus.NOT_FOUND);
        else if (deletedRating.kind === RatingKind.LIKE)
          likes -= 1;
        else if (deletedRating.kind === RatingKind.DISLIKE)
          dislikes -= 1;
        await this.mediaService.updateMediaRating(media, likes, dislikes, session);
        await session.commitTransaction();
        return;
      }
      const rating = await this.ratingModel.findOneAndUpdate({ media: <any>media, user: <any>authUser._id },
        { kind: kind, date: new Date() }, { upsert: true, setDefaultsOnInsert: true, session }).lean();
      if (rating) {
        if (rating.kind === RatingKind.LIKE)
          likes -= 1;
        else if (rating.kind === RatingKind.DISLIKE)
          dislikes -= 1;
      }
      if (kind === RatingKind.LIKE)
        likes += 1;
      else if (kind === RatingKind.DISLIKE)
        dislikes += 1;
      const updatedMedia = await this.mediaService.updateMediaRating(media, likes, dislikes, session);
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
