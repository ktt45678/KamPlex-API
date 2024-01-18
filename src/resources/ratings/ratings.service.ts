import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';

import { Rating, RatingDocument } from '../../schemas';
import { CreateRatingDto, CursorPageRatingsDto, FindRatingDto } from './dto';
import { Rating as RatingEntity } from './entities';
import { AuthUserDto } from '../users';
import { MediaService } from '../media/media.service';
import { StatusCode, MongooseConnection } from '../../enums';
import { convertToLanguageArray, createSnowFlakeId, LookupOptions, MongooseCursorPagination } from '../../utils';
import { plainToClassFromExist, plainToInstance } from 'class-transformer';
import { CursorPaginated } from '../../common/entities';
import { HeadersDto } from '../../common/dto';

@Injectable()
export class RatingsService {
  constructor(@InjectModel(Rating.name, MongooseConnection.DATABASE_A) private ratingModel: Model<RatingDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async create(createRatingDto: CreateRatingDto, authUser: AuthUserDto) {
    const { media, score } = createRatingDto;
    const session = await this.mongooseConnection.startSession();
    session.startTransaction();
    try {
      const oldRating = await this.ratingModel.findOneAndDelete({ media: <any>media, user: <any>authUser._id }, { session }).lean();
      const newRating = new this.ratingModel({
        _id: await createSnowFlakeId(),
        user: <any>authUser._id,
        media: <any>media,
        score: score,
        date: new Date()
      });
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
      await newRating.save({ session });
      await session.commitTransaction();
      return plainToInstance(RatingEntity, newRating.toObject());
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async findAll(cursorPageRatingDto: CursorPageRatingsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'date'];
    const typeMap = new Map<string, any>([['_id', BigInt], ['date', Date]]);
    const fields: { [key: string]: any } = { _id: 1, media: 1, score: 1, date: 1 };
    const { pageToken, limit, sort } = cursorPageRatingDto;
    const filters: { [key: string]: any } = {};
    if (authUser.isAnonymous && !cursorPageRatingDto.user)
      throw new HttpException({ code: StatusCode.RATING_USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    if (cursorPageRatingDto.user && cursorPageRatingDto.user !== authUser._id) {
      filters.user = cursorPageRatingDto.user;
    } else {
      filters.user = authUser._id;
    }
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, typeMap, filters });
    const lookupOptions: LookupOptions[] = [{
      from: 'media', localField: 'media', foreignField: '_id', as: 'media', isArray: false,
      pipeline: [{
        $project: {
          _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
          poster: 1, backdrop: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
          createdAt: 1, updatedAt: 1
        }
      }]
    }];
    const pipeline = aggregation.buildLookup(lookupOptions);
    const [data] = await this.ratingModel.aggregate(pipeline).exec();
    let ratings = new CursorPaginated<RatingEntity>();
    if (data) {
      const translatedRatings = convertToLanguageArray<RatingEntity>(headers.acceptLanguage, data.results, {
        populate: ['media'], ignoreRoot: true
      });
      ratings = plainToClassFromExist(new CursorPaginated<RatingEntity>({ type: RatingEntity }), {
        totalResults: data.totalResults,
        results: translatedRatings,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    }
    return ratings;
  }

  async remove(id: bigint, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedRating = await this.ratingModel.findOneAndDelete({ _id: id, user: <any>authUser._id }, { session }).lean();
      if (!deletedRating)
        throw new HttpException({ code: StatusCode.RATING_NOT_FOUND, message: 'Rating not found' }, HttpStatus.NOT_FOUND);
      await this.mediaService.updateMediaRating(<any>deletedRating.media, -1, -deletedRating.score, session);
    }).finally(() => session.endSession().catch(() => { }));
  }

  async findMedia(findRatingDto: FindRatingDto, authUser: AuthUserDto) {
    if (authUser.isAnonymous)
      return;
    const { media } = findRatingDto;
    return this.ratingModel.findOne({ media: media, user: authUser._id }, { score: 1, date: 1 }).lean().exec();
  }

  deleteMediaRating(media: bigint, session?: ClientSession) {
    return this.ratingModel.deleteMany({ media }, { session });
  }
}
