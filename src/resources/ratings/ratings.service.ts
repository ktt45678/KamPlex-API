import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

import { Rating, RatingDocument } from '../../schemas';
import { CreateRatingDto, CursorPageRatingsDto, FindRatingDto } from './dto';
import { Rating as RatingEntity } from './entities';
import { AuthUserDto } from '../users';
import { MediaService } from '../media/media.service';
import { StatusCode, MongooseConnection, MediaVisibility } from '../../enums';
import { convertToLanguageArray, createSnowFlakeId, LookupOptions, MongooseCursorPagination, tokenDataToPageToken } from '../../utils';
import { plainToClassFromExist, plainToInstance } from 'class-transformer';
import { CursorPaginated } from '../../common/entities';

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

  async findAll(cursorPageRatingDto: CursorPageRatingsDto, acceptLanguage: string, authUser: AuthUserDto) {
    const fields: { [key: string]: any } = { _id: 1, media: 1, score: 1, date: 1 };
    const { pageToken, limit } = cursorPageRatingDto;
    const filters: { [key: string]: any } = {};
    if (authUser.isAnonymous && !cursorPageRatingDto.user)
      throw new HttpException({ code: StatusCode.RATING_USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    if (cursorPageRatingDto.user && cursorPageRatingDto.user !== authUser._id) {
      filters.user = cursorPageRatingDto.user;
    } else {
      filters.user = authUser._id;
    }
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sort: { _id: -1 }, filters });
    const lookups: LookupOptions[] = [{
      from: 'media', localField: 'media', foreignField: '_id', as: 'media', isArray: false,
      project: {
        _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
        poster: 1, backdrop: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
        createdAt: 1, updatedAt: 1
      }
    }];
    const pipeline = aggregation.buildLookup(lookups);
    const [data] = await this.ratingModel.aggregate(pipeline).exec();
    let ratings = new CursorPaginated<RatingEntity>();
    if (data) {
      const translatedRatings = convertToLanguageArray<RatingEntity>(acceptLanguage, data.results, {
        populate: ['media'], ignoreRoot: true
      });
      ratings = plainToClassFromExist(new CursorPaginated<RatingEntity>({ type: RatingEntity }), {
        results: translatedRatings,
        nextPageToken: tokenDataToPageToken(data.nextPageToken),
        prevPageToken: tokenDataToPageToken(data.prevPageToken)
      });
    }
    return ratings;
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
