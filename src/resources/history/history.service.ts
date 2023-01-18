import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, LeanDocument, Model, PipelineStage } from 'mongoose';
import { plainToClassFromExist } from 'class-transformer';

import { History, HistoryDocument, TVEpisode } from '../../schemas';
import { UpdateHistoryDto, CursorPageHistoryDto, FindWatchTimeDto } from './dto';
import { HistoryGroupable } from './entities';
import { AuthUserDto } from '../users';
import { MediaService } from '../media/media.service';
import { convertToLanguageArray, createSnowFlakeId, getPageQuery, parsePageToken, tokenDataToPageToken } from '../../utils';
import { MediaType, MongooseConnection, StatusCode } from '../../enums';
import { CursorPaginated } from '../../common/entities';

@Injectable()
export class HistoryService {
  constructor(@InjectModel(History.name, MongooseConnection.DATABASE_A) private historyModel: Model<HistoryDocument>,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async findAll(cursorPageHistoryDto: CursorPageHistoryDto, acceptLanguage: string, authUser: AuthUserDto) {
    const {
      pageToken, limit, startDate, endDate, mediaIds, mediaType, mediaOriginalLanguage, mediaYear, mediaAdult, mediaGenres
    } = cursorPageHistoryDto;
    // Calculate sort
    let sortTarget = 'date';
    let sortDirection = -1;
    const sort: {} = { date: -1 };
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
    // Create pipeline
    const pipeline: PipelineStage[] = [
      { $match: filters },
      { $sort: sort }
    ];
    // Calculate page
    if (pageToken) {
      const [navType, pageValue] = parsePageToken(pageToken);
      const pagingQuery = getPageQuery(pageValue, navType, sortDirection, sortTarget);
      pipeline.push({ $match: { $expr: pagingQuery } });
    }
    const hasMediaFilters = mediaAdult != undefined || mediaGenres != undefined ||
      mediaOriginalLanguage != undefined || mediaType != undefined || mediaYear != undefined;
    if (!hasMediaFilters) {
      pipeline.push({ $limit: limit });
    }
    pipeline.push(
      {
        $lookup: {
          from: 'media',
          as: 'media',
          let: { 'mediaId': '$media' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$mediaId']
                }
              }
            },
            {
              $project: {
                _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
                poster: 1, backdrop: 1, genres: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1,
                _translations: 1, createdAt: 1, updatedAt: 1
              }
            }
          ]
        }
      }
    );
    if (hasMediaFilters) {
      const mediaFilters: { [key: string]: any } = {};
      mediaType != undefined && (mediaFilters['media.type'] = mediaType);
      mediaOriginalLanguage != undefined && (mediaFilters['media.originalLanguage'] = mediaOriginalLanguage);
      mediaYear != undefined && (mediaFilters['media.releaseDate.year'] = mediaYear);
      mediaAdult != undefined && (mediaFilters['media.adult'] = mediaAdult);
      if (Array.isArray(mediaGenres))
        mediaFilters['media.genres'] = { $in: mediaGenres };
      else if (mediaGenres != undefined)
        mediaFilters['media.genres'] = mediaGenres;
      pipeline.push(
        { $match: mediaFilters },
        { $limit: limit }
      );
    }
    pipeline.push(
      { $project: { 'media.genres': 0 } },
      {
        $lookup: {
          from: 'tvepisodes',
          as: 'episode',
          let: { 'episodeId': '$episode' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$episodeId']
                }
              }
            },
            {
              $project: {
                _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1,
                chapters: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1
              }
            }
          ]
        }
      },
      { $unwind: { path: '$media', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$episode', preserveNullAndEmptyArrays: true } },
      { $addFields: { groupByDate: { $dateToString: { date: '$date', format: '%Y-%m-%d' } } } },
      //{ $group: { _id: '$groupByDate', results: { $push: '$$ROOT' } } },
      //{ $sort: { _id: -1 } },
      //{ $project: { _id: 0, groupByDate: '$_id', historyList: '$results' } },
      { $group: { _id: null, results: { $push: '$$ROOT' } } },
      {
        $project: {
          _id: 0, results: 1,
          //nextPageToken: [1, { $last: { $last: '$results.historyList.' + sortTarget } }],
          //prevPageToken: [-1, { $first: { $first: '$results.historyList.' + sortTarget } }],
          nextPageToken: [1, { $last: '$results.' + sortTarget }],
          prevPageToken: [-1, { $first: '$results.' + sortTarget }]
        }
      }
    );
    const [data] = await this.historyModel.aggregate(pipeline).exec();
    let historyList = new CursorPaginated<HistoryGroupable>();
    if (data) {
      /*
      data.results.forEach((result: HistoryGroup) => {
        result.historyList = convertToLanguageArray<HistoryEntity>(acceptLanguage, result.historyList, {
          populate: ['media', 'episode'], ignoreRoot: true
        });
      });
      */
      data.results = convertToLanguageArray<HistoryGroupable>(acceptLanguage, data.results, {
        populate: ['media', 'episode'], ignoreRoot: true
      });
      historyList = plainToClassFromExist(new CursorPaginated<HistoryGroupable>({ type: HistoryGroupable }), {
        results: data.results,
        nextPageToken: tokenDataToPageToken(data.nextPageToken),
        prevPageToken: tokenDataToPageToken(data.prevPageToken)
      });
    }
    return historyList;
  }

  async findOneWatchTime(findWatchTimeDto: FindWatchTimeDto, authUser: AuthUserDto) {
    const findHistoryFilters: { [key: string]: any } = { user: <any>authUser._id, media: findWatchTimeDto.media };
    if (findWatchTimeDto.episode)
      findHistoryFilters.episode = findWatchTimeDto.episode;
    const history = await this.historyModel.findOne(findHistoryFilters, { _id: 1, watchTime: 1, date: 1 })
      .lean().exec();
    return history;
  }

  async update(updateHistoryDto: UpdateHistoryDto, authUser: AuthUserDto) {
    const media = await this.mediaService.findOneById(updateHistoryDto.media, {
      _id: 1, type: 1, title: 1, createdAt: 1, updatedAt: 1
    });
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const findHistoryFilters: { [key: string]: any } = { user: <any>authUser._id, media: <any>updateHistoryDto.media };
    let episode: LeanDocument<TVEpisode>;
    if (media.type === MediaType.TV) {
      if (updateHistoryDto.episode == undefined)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      episode = await this.mediaService.findOneTVEpisodeById(updateHistoryDto.media, updateHistoryDto.episode, {
        _id: 1, episode: 1, createdAt: 1, updatedAt: 1
      });
      if (!episode)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      findHistoryFilters.episode = episode._id;
    }
    return this.historyModel.findOneAndUpdate(findHistoryFilters,
      {
        $set: { date: new Date() },
        $max: { watchTime: updateHistoryDto.watchTime },
        $setOnInsert: { _id: await createSnowFlakeId() }
      }, { upsert: true, new: true }
    ).lean().exec();
  }

  async remove(id: string, authUser: AuthUserDto) {
    const deletedHistory = await this.historyModel.findOneAndDelete({ _id: id, user: authUser._id }).exec();
    if (!deletedHistory)
      throw new HttpException({ code: StatusCode.HISTORY_NOT_FOUND, message: 'History not found' }, HttpStatus.NOT_FOUND);
  }

  deleteMediaHistory(media: string, session?: ClientSession) {
    return this.historyModel.deleteMany({ media }, { session });
  }

  deleteTVEpisodeHistory(episode: string, session?: ClientSession) {
    return this.historyModel.deleteMany({ episode }, { session });
  }
}
