import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, PipelineStage } from 'mongoose';
import { plainToClassFromExist } from 'class-transformer';

import { History, HistoryDocument, TVEpisode } from '../../schemas';
import { UpdateHistoryDto, CursorPageHistoryDto, FindWatchTimeDto, UpdateWatchTimeDto } from './dto';
import { HistoryGroupable } from './entities';
import { AuthUserDto } from '../users';
import { MediaService } from '../media/media.service';
import { convertToLanguageArray, createSnowFlakeId, LookupOptions, MongooseCursorPagination } from '../../utils';
import { MediaType, MongooseConnection, StatusCode } from '../../enums';
import { CursorPaginated } from '../../common/entities';
import { HeadersDto } from '../../common/dto';

@Injectable()
export class HistoryService {
  constructor(@InjectModel(History.name, MongooseConnection.DATABASE_A) private historyModel: Model<HistoryDocument>,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async findAll(cursorPageHistoryDto: CursorPageHistoryDto, headers: HeadersDto, authUser: AuthUserDto) {
    const {
      pageToken, limit, startDate, endDate, mediaIds, mediaType, mediaOriginalLanguage, mediaYear, mediaAdult, mediaGenres
    } = cursorPageHistoryDto;
    const fields: { [key: string]: any } = { _id: 1, media: 1, episode: 1, time: 1, date: 1, paused: 1, watched: 1 };
    const mediaFields: { [key: string]: any } = {
      _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pLastEpisode': 1,
      poster: 1, backdrop: 1, genres: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1,
      _translations: 1, createdAt: 1, updatedAt: 1
    };
    const episodeFields: { [key: string]: any } = {
      _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1,
      visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const sort: { [key: string]: number } = { date: -1 };
    const filters: FilterQuery<HistoryDocument> = { user: authUser._id };
    if (startDate != undefined && endDate != undefined) {
      filters.date = { $gte: startDate, $lte: endDate };
    }
    if (mediaIds != undefined) {
      if (Array.isArray(mediaIds))
        filters.media = { $in: mediaIds };
      else
        filters.media = mediaIds;
    }
    const typeMap = new Map<string, any>([['date', Date]]);
    const aggregation = new MongooseCursorPagination({ pageToken, limit, sort, filters, fields, typeMap });
    const lookupOptions: LookupOptions[] = [{
      from: 'media', localField: 'media', foreignField: '_id', as: 'media', isArray: false,
      pipeline: [{ $project: mediaFields }]
    }, {
      from: 'tvepisodes', localField: 'episode', foreignField: '_id', as: 'episode', isArray: false,
      pipeline: [{ $project: episodeFields }]
    }];
    const pipeline = aggregation.buildLookup(lookupOptions);
    // Workaround to add group by date field
    pipeline[2]['$facet']['stage2'].push({
      $addFields: { groupByDate: { $dateToString: { date: '$date', format: '%Y-%m-%d' } } }
    });
    // Workaround to filter media
    const hasMediaFilters = mediaAdult != undefined || mediaGenres != undefined ||
      mediaOriginalLanguage != undefined || mediaType != undefined || mediaYear != undefined;
    if (hasMediaFilters) {
      const mediaFilters: { [key: string]: any } = {};
      mediaType != undefined && (mediaFilters['media.type'] = mediaType);
      mediaOriginalLanguage != undefined && (mediaFilters['media.originalLang'] = mediaOriginalLanguage);
      mediaYear != undefined && (mediaFilters['media.releaseDate.year'] = mediaYear);
      mediaAdult != undefined && (mediaFilters['media.adult'] = mediaAdult);
      if (Array.isArray(mediaGenres))
        mediaFilters['media.genres'] = { $all: mediaGenres };
      else if (mediaGenres != undefined)
        mediaFilters['media.genres'] = mediaGenres;
      // Insert media filters
      const lookupMediaIndex = pipeline[2]['$facet']['stage2'].findIndex((p: PipelineStage) =>
        p.hasOwnProperty('$lookup') && p['$lookup']['from'] === 'media');
      pipeline[2]['$facet']['stage2'].splice(lookupMediaIndex + 2, 0, { $match: mediaFilters });
      // Move limit pipeline to below
      const lookupLimitIndex = pipeline[2]['$facet']['stage2'].findIndex((p: PipelineStage) => p.hasOwnProperty('$limit'));
      const [limitPipeline] = pipeline[2]['$facet']['stage2'].splice(lookupLimitIndex, 1);
      pipeline[2]['$facet']['stage2'].splice(lookupMediaIndex + 2, 0, limitPipeline);
    }
    const [data] = await this.historyModel.aggregate(pipeline).exec();
    let historyList = new CursorPaginated<HistoryGroupable>();
    if (data) {
      data.results = convertToLanguageArray<HistoryGroupable>(headers.acceptLanguage, data.results, {
        populate: ['media', 'episode'], ignoreRoot: true
      });
      historyList = plainToClassFromExist(new CursorPaginated<HistoryGroupable>({ type: HistoryGroupable }), {
        totalResults: data.totalResults,
        results: data.results,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    }
    return historyList;
  }

  async findOneWatchTime(findWatchTimeDto: FindWatchTimeDto, authUser: AuthUserDto) {
    const findHistoryFilters: { [key: string]: any } = { user: authUser._id, media: findWatchTimeDto.media };
    if (findWatchTimeDto.episode)
      findHistoryFilters.episode = findWatchTimeDto.episode;
    const history = await this.historyModel.findOne(findHistoryFilters, { _id: 1, time: 1, date: 1, paused: 1, watched: 1 })
      .lean().exec();
    return history;
  }

  async update(id: bigint, updateHistoryDto: UpdateHistoryDto, authUser: AuthUserDto) {
    if (!Object.keys(updateHistoryDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const history = await this.historyModel.findOne({ _id: id, user: authUser._id }, { paused: 1, watched: 1 }).exec();
    if (!history)
      throw new HttpException({ code: StatusCode.HISTORY_NOT_FOUND, message: 'History not found' }, HttpStatus.NOT_FOUND);
    if (updateHistoryDto.paused != undefined)
      history.paused = updateHistoryDto.paused;
    if (updateHistoryDto.watched === 1)
      history.watched += 1;
    else if (updateHistoryDto.watched === 0)
      history.watched = 0;
    await history.save();
    return history.toObject();
  }

  async remove(id: bigint, authUser: AuthUserDto) {
    const deletedHistory = await this.historyModel.findOneAndDelete({ _id: id, user: authUser._id }).lean().exec();
    if (!deletedHistory)
      throw new HttpException({ code: StatusCode.HISTORY_NOT_FOUND, message: 'History not found' }, HttpStatus.NOT_FOUND);
  }

  async updateWatchTime(updateWatchTimeDto: UpdateWatchTimeDto, authUser: AuthUserDto) {
    const media = await this.mediaService.findOneById(updateWatchTimeDto.media, {
      _id: 1, type: 1, title: 1, createdAt: 1, updatedAt: 1
    });
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const findHistoryFilters: { [key: string]: any } = { user: authUser._id, media: updateWatchTimeDto.media };
    let episode: TVEpisode;
    if (media.type === MediaType.TV) {
      if (updateWatchTimeDto.episode == undefined)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      episode = await this.mediaService.findOneTVEpisodeById(updateWatchTimeDto.media, updateWatchTimeDto.episode, {
        _id: 1, episode: 1, createdAt: 1, updatedAt: 1
      });
      if (!episode)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      findHistoryFilters.episode = episode._id;
    }
    let history = await this.historyModel.findOne(findHistoryFilters).exec();
    if (!history) {
      const newHistory = new this.historyModel({
        _id: await createSnowFlakeId(),
        ...findHistoryFilters,
        date: new Date(),
        time: updateWatchTimeDto.time
      });
      history = newHistory;
    } else if (!history.paused) {
      history.time = updateWatchTimeDto.time;
      history.date = new Date();
    }
    await history.save();
    history.__v = undefined;
    return history.toObject();
  }

  deleteMediaHistory(media: bigint, session?: ClientSession) {
    return this.historyModel.deleteMany({ media }, { session });
  }

  deleteTVEpisodeHistory(media: bigint, episode: bigint, session?: ClientSession) {
    return this.historyModel.deleteMany({ media, episode }, { session });
  }
}
