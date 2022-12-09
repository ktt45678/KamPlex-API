import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

import { Rating, RatingDocument } from '../../schemas';
import { CreateRatingDto, FindRatingDto } from './dto';
import { Rating as RatingEntity } from './entities';
import { AuthUserDto } from '../users';
import { MediaService } from '../media/media.service';
import { StatusCode, MongooseConnection } from '../../enums';
import { createSnowFlakeId } from '../../utils';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RatingsService {
  constructor(@InjectModel(Rating.name, MongooseConnection.DATABASE_A) private ratingModel: Model<RatingDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private mediaService: MediaService) { }

  async create(createRatingDto: CreateRatingDto, authUser: AuthUserDto) {
    const { media, score } = createRatingDto;
    const session = await this.mongooseConnection.startSession();
    session.startTransaction();
    try {
      const oldRating = await this.ratingModel.findOneAndUpdate({ media: <any>media, user: <any>authUser._id },
        { $set: { score: score, date: new Date() }, $setOnInsert: { _id: await createSnowFlakeId() } },
        { upsert: true, session }).lean();
      let incCount = 1;
      let incScore = score;
      // If there's a previous rating value
      if (oldRating) {
        incCount = 0;
        incScore -= oldRating.score;
      }
      const updatedMedia = await this.mediaService.updateMediaRating(media, incCount, incScore, session);
      if (!updatedMedia)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      const rating = await this.ratingModel.findOne({ media: <any>media, user: <any>authUser._id }).session(session).lean();
      await session.commitTransaction();
      return plainToInstance(RatingEntity, rating);
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async remove(id: string, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedRating = await this.ratingModel.findOneAndDelete({ _id: id, user: <any>authUser._id }, { session }).lean();
      if (!deletedRating)
        throw new HttpException({ code: StatusCode.RATING_NOT_FOUND, message: 'Rating not found' }, HttpStatus.NOT_FOUND);
      await this.mediaService.updateMediaRating(<any>deletedRating.media, -1, -deletedRating.score, session);
    });
  }

  async findMedia(findRatingDto: FindRatingDto, authUser: AuthUserDto) {
    if (authUser.isAnonymous)
      return;
    const { media } = findRatingDto;
    return this.ratingModel.findOne({ media: <any>media, user: <any>authUser._id }, { score: 1, date: 1 }).lean().exec();
  }
}
