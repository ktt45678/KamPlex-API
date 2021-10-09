import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { plainToClassFromExist } from 'class-transformer';

import { History, HistoryDocument } from '../../schemas/history.schema';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateHistoryDto } from './dto/paginate-history.dto';
import { History as HistoryEntity } from './entities/history.entity';
import { Paginated } from '../roles/entities/paginated.entity';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { convertToLanguageArray } from '../../utils/i18n-transform.util';

@Injectable()
export class HistoryService {
  constructor(@InjectModel(History.name) private historyModel: Model<HistoryDocument>) { }

  async findAll(paginateHistoryDto: PaginateHistoryDto, authUser: AuthUserDto) {
    const { page, limit, language } = paginateHistoryDto;
    const filters = { user: authUser._id };
    const fields = { _id: 1, media: 1, date: 1 };
    const sort = { date: -1 };
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sort });
    const lookups: LookupOptions[] = [{
      from: 'media', localField: 'media', foreignField: '_id', as: 'media',
      project: {
        _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
        adult: 1, releaseDate: 1, views: 1, likes: 1, dislikes: 1, _translations: 1, createdAt: 1, updatedAt: 1
      },
      isArray: false,
      children: [{
        from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
        project: { _id: 1, name: 1, _translations: 1 }
      }, {
        from: 'mediastorages', localField: 'poster', foreignField: '_id', as: 'poster', isArray: false
      }, {
        from: 'mediastorages', localField: 'backdrop', foreignField: '_id', as: 'backdrop', isArray: false
      }]
    }];
    const [data] = await this.historyModel.aggregate(aggregation.buildLookup(lookups)).exec();
    let history = new Paginated<HistoryEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<HistoryEntity>(language, data.results, {
        populate: ['media', 'media.genres'],
        ignoreRoot: true
      });
      history = plainToClassFromExist(new Paginated<HistoryEntity>({ type: HistoryEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return history;
  }

  updateHistoryMedia(user: string, media: string, session?: ClientSession) {
    return this.historyModel.findOneAndUpdate({ user: <any>user, media: <any>media }, { date: new Date() },
      { upsert: true, setDefaultsOnInsert: true, session }).lean();
  }
}
