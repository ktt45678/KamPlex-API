import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, FilterQuery, Model, PopulateOptions, Types, UpdateQuery } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { instanceToPlain, plainToInstance, plainToClassFromExist } from 'class-transformer';
import ISO6391 from 'iso-639-1';
import slugify from 'slugify';
import removeAccents from 'remove-accents';
import mimeTypes from 'mime-types';
import isISO31661Alpha2 from 'validator/lib/isISO31661Alpha2';
import pLimit from 'p-limit';

import { CreateMediaDto, UpdateMediaDto, AddMediaVideoDto, UpdateMediaVideoDto, AddMediaSourceDto, AddMediaStreamDto, MediaQueueStatusDto, SaveMediaSourceDto, FindTVEpisodesDto, AddTVEpisodeDto, UpdateTVEpisodeDto, AddMediaChapterDto, UpdateMediaChapterDto, FindMediaDto, DeleteMediaVideosDto, DeleteMediaSubtitlesDto, DeleteMediaChaptersDto, OffsetPageMediaDto, CursorPageMediaDto, MediaQueueDataDto } from './dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { Media, MediaDocument, MediaStorage, MediaStorageDocument, MediaFile, DriveSession, DriveSessionDocument, Movie, TVShow, TVEpisode, TVEpisodeDocument, MediaVideo, MediaChapter, Setting, MediaExternalStreams } from '../../schemas';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GenresService } from '../genres/genres.service';
import { ProductionsService } from '../productions/productions.service';
import { TagsService } from '../tags/tags.service';
import { CollectionService } from '../collection/collection.service';
import { HistoryService } from '../history/history.service';
import { PlaylistsService } from '../playlists/playlists.service';
import { RatingsService } from '../ratings/ratings.service';
import { SettingsService } from '../settings/settings.service';
import { AzureBlobService } from '../../common/modules/azure-blob/azure-blob.service';
import { OnedriveService } from '../../common/modules/onedrive/onedrive.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { WsAdminGateway } from '../ws-admin';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { Media as MediaEntity, MediaDetails, MediaSubtitle, MediaStream, TVEpisode as TVEpisodeEntity, TVEpisodeDetails } from './entities';
import { LookupOptions, MongooseOffsetPagination, convertToLanguage, convertToLanguageArray, createSnowFlakeId, readFirstLine, trimSlugFilename, isEmptyObject, AuditLogBuilder, MongooseCursorPagination } from '../../utils';
import { MediaType, MediaVideoSite, StatusCode, MongooseConnection, TaskQueue, MediaStorageType, MediaPStatus, MediaSourceStatus, AzureStorageContainer, AuditLogType, MediaFileType, MediaVisibility, QueueStatus, SocketMessage, SocketRoom, CachePrefix } from '../../enums';
import { I18N_DEFAULT_LANGUAGE, STREAM_CODECS } from '../../config';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name, MongooseConnection.DATABASE_A) private mediaModel: Model<MediaDocument>,
    @InjectModel(MediaStorage.name, MongooseConnection.DATABASE_A) private mediaStorageModel: Model<MediaStorageDocument>,
    @InjectModel(DriveSession.name, MongooseConnection.DATABASE_A) private driveSessionModel: Model<DriveSessionDocument>,
    @InjectModel(TVEpisode.name, MongooseConnection.DATABASE_A) private tvEpisodeModel: Model<TVEpisodeDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @InjectQueue(TaskQueue.VIDEO_TRANSCODE) private videoTranscodeQueue: Queue,
    @InjectQueue(TaskQueue.VIDEO_CANCEL) private videoCancelQueue: Queue,
    @Inject(forwardRef(() => GenresService)) private genresService: GenresService,
    @Inject(forwardRef(() => ProductionsService)) private productionsService: ProductionsService,
    @Inject(forwardRef(() => TagsService)) private tagsService: TagsService,
    @Inject(forwardRef(() => CollectionService)) private collectionService: CollectionService,
    @Inject(forwardRef(() => HistoryService)) private historyService: HistoryService,
    @Inject(forwardRef(() => PlaylistsService)) private playlistsService: PlaylistsService,
    @Inject(forwardRef(() => RatingsService)) private ratingsService: RatingsService,
    private auditLogService: AuditLogService,
    private externalStoragesService: ExternalStoragesService, private settingsService: SettingsService,
    private wsAdminGateway: WsAdminGateway, private onedriveService: OnedriveService,
    private azureBlobService: AzureBlobService) { }

  async create(createMediaDto: CreateMediaDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { type, title, originalTitle, overview, originalLang, runtime, adult, releaseDate, lastAirDate, status,
      visibility, externalIds, scanner } = createMediaDto;
    const slug = !originalTitle || originalTitle.toLowerCase() === title.toLowerCase() ?
      slugify(removeAccents(title), { lower: true }) :
      slugify(removeAccents(`${title} ${originalTitle}`), { lower: true });
    const media = new this.mediaModel({
      type, title, originalTitle, slug, overview, originalLang, runtime, adult, releaseDate, status,
      visibility, pStatus: MediaPStatus.PENDING, externalIds, scanner, addedBy: authUser._id
    });
    media._id = await createSnowFlakeId();
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_CREATE);
    if (createMediaDto.type === MediaType.MOVIE) {
      media.movie = new Movie();
      media.movie.status = MediaSourceStatus.PENDING;
    }
    else if (createMediaDto.type === MediaType.TV) {
      media.tv = new TVShow();
      if (lastAirDate) {
        media.tv.lastAirDate = lastAirDate;
      }
    }
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (createMediaDto.genres) {
        const genreIds = await this.findOrCreateGenres(createMediaDto.genres, authUser._id, session);
        media.genres = <any>genreIds;
        await this.genresService.addMediaGenres(media._id, genreIds, session);
      }
      if (createMediaDto.studios) {
        const studioIds = await this.findOrCreateProductions(createMediaDto.studios, authUser._id, session);
        media.studios = <any>studioIds;
        await this.productionsService.addMediaStudios(media._id, studioIds, session);
      }
      if (createMediaDto.producers) {
        const producerIds = await this.findOrCreateProductions(createMediaDto.producers, authUser._id, session);
        media.producers = <any>producerIds;
        await this.productionsService.addMediaProductions(media._id, producerIds, session);
      }
      if (createMediaDto.tags) {
        const tagIds = await this.findOrCreateTags(createMediaDto.tags, authUser._id, session);
        media.tags = <any>tagIds;
        await this.tagsService.addMediaTags(media._id, tagIds, session);
      }
      auditLog.getChangesFrom(media, ['slug']);
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    await media.populate([
      { path: 'genres', select: { _id: 1, name: 1 } },
      { path: 'studios', select: { _id: 1, name: 1 } },
      { path: 'producers', select: { _id: 1, name: 1 } },
      { path: 'tags', select: { _id: 1, name: 1 } }
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(SocketRoom.ADMIN_MEDIA_LIST).emit(SocketMessage.REFRESH_MEDIA);
    return plainToInstance(MediaDetails, media.toObject());
  }

  async findAll(offsetPageMediaDto: OffsetPageMediaDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'title', 'originalLang', 'releaseDate.year', 'releaseDate.month', 'releaseDate.day', 'views',
      'dailyViews', 'weeklyViews', 'monthlyViews', 'ratingAverage', 'createdAt', 'updatedAt'];
    const [fields, filters] = this.createFindAllParams(offsetPageMediaDto, authUser.hasPermission);
    const { page, limit, sort, search } = offsetPageMediaDto;
    const aggregation = new MongooseOffsetPagination({ page, limit, fields, sortQuery: sort, search, sortEnum, fullTextSearch: true });
    Object.keys(filters).length && (aggregation.filters = filters);
    const lookupOptions: LookupOptions[] = [
      {
        from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
        pipeline: [{ $project: { _id: 1, name: 1, _translations: 1 } }]
      },
      {
        from: 'tvepisodes', localField: 'tv.pLastEpisode', foreignField: '_id', as: 'tv.pLastEpisode', isArray: false,
        pipeline: [{ $project: { _id: 1, name: 1, epNumber: 1 } }]
      }
    ];
    if (authUser.hasPermission)
      lookupOptions.push({
        from: 'tvepisodes', localField: 'tv.lastEpisode', foreignField: '_id', as: 'tv.lastEpisode', isArray: false,
        pipeline: [{ $project: { _id: 1, name: 1, epNumber: 1 } }]
      });
    const pipeline = aggregation.buildLookup(lookupOptions);
    const [data] = await this.mediaModel.aggregate(pipeline).exec();
    let mediaList = new Paginated<MediaEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<MediaEntity>(headers.acceptLanguage, data.results, {
        populate: ['genres'], keepTranslationsObject: authUser.hasPermission
      });
      mediaList = plainToClassFromExist(new Paginated<MediaEntity>({ type: MediaEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return mediaList;
  }

  async findAllCursor(cursorPageMediaDto: CursorPageMediaDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'createdAt', 'updatedAt'];
    const [fields, filters] = this.createFindAllParams(cursorPageMediaDto, authUser.hasPermission);
    const { pageToken, limit, sort, search } = cursorPageMediaDto;
    const typeMap = new Map<string, any>([['_id', String], ['createdAt', Date], ['updatedAt', Date]]);
    const aggregation = new MongooseCursorPagination({
      pageToken, limit, fields, sortQuery: sort, search, sortEnum, typeMap,
      fullTextSearch: true
    });
    Object.keys(filters).length && (aggregation.filters = filters);
    const lookupOptions: LookupOptions[] = [
      {
        from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
        pipeline: [{ $project: { _id: 1, name: 1, _translations: 1 } }]
      },
      {
        from: 'tvepisodes', localField: 'tv.pLastEpisode', foreignField: '_id', as: 'tv.pLastEpisode', isArray: false,
        pipeline: [{ $project: { _id: 1, name: 1, epNumber: 1 } }]
      }
    ];
    if (authUser.hasPermission)
      lookupOptions.push({
        from: 'tvepisodes', localField: 'tv.lastEpisode', foreignField: '_id', as: 'tv.lastEpisode', isArray: false,
        pipeline: [{ $project: { _id: 1, name: 1, epNumber: 1 } }]
      });
    const pipeline = aggregation.buildLookup(lookupOptions);
    const [data] = await this.mediaModel.aggregate(pipeline).exec();
    let mediaList = new CursorPaginated<MediaEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<MediaEntity>(headers.acceptLanguage, data.results, {
        populate: ['genres'], keepTranslationsObject: authUser.hasPermission
      });
      mediaList = plainToClassFromExist(new CursorPaginated<MediaEntity>({ type: MediaEntity }), {
        totalResults: data.totalResults,
        results: translatedResults,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    }
    return mediaList;
  }

  async findOne(id: bigint, headers: HeadersDto, findMediaDto: FindMediaDto, authUser: AuthUserDto) {
    const project: { [key: string]: number } = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLang: 1,
      studios: 1, producers: 1, tags: 1, credits: 1, runtime: 1, videos: 1, adult: 1, releaseDate: 1, status: 1, externalIds: 1,
      views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1, ratingCount: 1, ratingScore: 1, ratingAverage: 1, visibility: 1,
      _translations: 1, createdAt: 1, updatedAt: 1, 'tv.pLastEpisode': 1, 'tv.lastAirDate': 1, 'tv.episodes': 1
    };
    const population: PopulateOptions[] = [
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'studios', select: { _id: 1, name: 1 } },
      { path: 'producers', select: { _id: 1, name: 1 } },
      { path: 'tags', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'tv.pLastEpisode', select: { _id: 1, epNumber: 1, name: 1 } }
    ];
    if (authUser.hasPermission) {
      project.scanner = 1;
      project.pStatus = 1;
      project.addedBy = 1;
      project['movie.subtitles'] = 1;
      project['movie.chapters'] = 1;
      project['movie.status'] = 1;
      project['tv.episodeCount'] = 1;
      project['tv.lastEpisode'] = 1;
      population.push(
        { path: 'tv.lastEpisode', select: { _id: 1, epNumber: 1, name: 1 } },
        {
          path: 'addedBy',
          select: { _id: 1, username: 1, nickname: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 }
        }
      );
    }
    const episodePopulation: PopulateOptions = {
      path: 'tv.episodes', select: {
        _id: 1, epNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, visibility: 1,
        _translations: 1, createdAt: 1, updatedAt: 1
      }, match: {}
    };
    authUser.hasPermission && (episodePopulation.select.pStatus = 1);
    if (!authUser.hasPermission || !findMediaDto.includeHiddenEps)
      episodePopulation.match.pStatus = MediaPStatus.DONE;
    if (!authUser.hasPermission || !findMediaDto.includeUnprocessedEps)
      episodePopulation.match.visibility = MediaVisibility.PUBLIC;
    population.push(episodePopulation);
    const media = await this.mediaModel.findOne({ _id: id }, project).populate(population).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);

    const translated = convertToLanguage<Media>(headers.acceptLanguage, media, {
      populate: ['genres', 'tags', 'tv.episodes', 'videos'], keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(MediaDetails, translated);
  }

  async update(id: bigint, updateMediaDto: UpdateMediaDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateMediaDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const media = await this.mediaModel.findOne({ _id: id }, {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, genres: 1, originalLang: 1,
      studios: 1, producers: 1, tags: 1, credits: 1, runtime: 1, videos: 1, adult: 1, releaseDate: 1, status: 1,
      externalIds: 1, ratingCount: 1, ratingAverage: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1, movie: 1,
      'tv.episodeCount': 1, 'tv.lastEpisode': 1, 'tv.pLastEpisode': 1, 'tv.lastAirDate': 1, scanner: 1
    }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_UPDATE);
    if (updateMediaDto.translate && updateMediaDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const titleKey = `_translations.${updateMediaDto.translate}.title`;
      if (updateMediaDto.title)
        media.set(titleKey, updateMediaDto.title);
      const overviewKey = `_translations.${updateMediaDto.translate}.overview`;
      if (updateMediaDto.overview)
        media.set(overviewKey, updateMediaDto.overview);
      const slug = slugify(removeAccents(updateMediaDto.title), { lower: true, locale: updateMediaDto.translate });
      media.set(`_translations.${updateMediaDto.translate}.slug`, slug || null);
      await media.save();
    }
    else {
      const session = await this.mongooseConnection.startSession();
      await session.withTransaction(async () => {
        if (updateMediaDto.title)
          media.title = updateMediaDto.title;
        if (updateMediaDto.originalTitle !== undefined)
          media.originalTitle = updateMediaDto.originalTitle;
        if (updateMediaDto.overview)
          media.overview = updateMediaDto.overview;
        if (updateMediaDto.originalLang !== undefined)
          media.originalLang = updateMediaDto.originalLang;
        if (updateMediaDto.runtime != undefined)
          media.runtime = updateMediaDto.runtime;
        if (updateMediaDto.visibility != undefined)
          media.visibility = updateMediaDto.visibility;
        if (updateMediaDto.adult != undefined)
          media.adult = updateMediaDto.adult;
        if (updateMediaDto.status != undefined)
          media.status = updateMediaDto.status;
        if (updateMediaDto.releaseDate != undefined)
          media.releaseDate = updateMediaDto.releaseDate;
        if (updateMediaDto.lastAirDate !== undefined && media.type === MediaType.TV)
          media.tv.lastAirDate = updateMediaDto.lastAirDate;
        if (updateMediaDto.externalIds) {
          if (updateMediaDto.externalIds.imdb !== undefined)
            media.set('externalIds.imdb', updateMediaDto.externalIds.imdb);
          if (updateMediaDto.externalIds.tmdb !== undefined)
            media.set('externalIds.tmdb', updateMediaDto.externalIds.tmdb);
          if (updateMediaDto.externalIds.aniList !== undefined)
            media.set('externalIds.aniList', updateMediaDto.externalIds.aniList);
          if (updateMediaDto.externalIds.mal !== undefined)
            media.set('externalIds.mal', updateMediaDto.externalIds.mal);
        }
        if (updateMediaDto.scanner) {
          if (updateMediaDto.scanner.enabled != undefined)
            media.set('scanner.enabled', updateMediaDto.scanner.enabled);
          if (updateMediaDto.scanner.tvSeason !== undefined && media.type === MediaType.TV)
            media.set('scanner.tvSeason', updateMediaDto.scanner.tvSeason);
        }
        if (updateMediaDto.title || updateMediaDto.originalTitle !== undefined) {
          const slug = !media.originalTitle || media.originalTitle?.toLowerCase() === media.title.toLowerCase() ?
            slugify(removeAccents(media.title), { lower: true }) :
            slugify(removeAccents(`${media.title} ${media.originalTitle}`), { lower: true });
          media.slug = slug;
        }
        if (updateMediaDto.genres) {
          const updateGenreIds = await this.findOrCreateGenres(updateMediaDto.genres, authUser._id, session);
          const mediaGenres: any[] = media.genres.toObject();
          const newGenres = updateGenreIds.filter(e => !mediaGenres.includes(e));
          const oldGenres = mediaGenres.filter(e => !updateGenreIds.includes(e));
          media.genres = <any>updateGenreIds;
          await Promise.all([
            this.genresService.addMediaGenres(media._id, newGenres, session),
            this.genresService.deleteMediaGenres(media._id, oldGenres, session)
          ]);
        }
        if (updateMediaDto.studios) {
          const updateStudioIds = await this.findOrCreateProductions(updateMediaDto.studios, authUser._id, session);
          const mediaStudios: any[] = media.studios;
          const newStudios = updateStudioIds.filter(e => !mediaStudios.includes(e));
          const oldStudios = mediaStudios.filter(e => !updateStudioIds.includes(e));
          media.studios = <any>updateStudioIds;
          await Promise.all([
            this.productionsService.addMediaStudios(media._id, newStudios, session),
            this.productionsService.deleteMediaStudios(media._id, oldStudios, session)
          ]);
        }
        if (updateMediaDto.producers) {
          const updateProductionIds = await this.findOrCreateProductions(updateMediaDto.producers, authUser._id, session);
          const mediaProductions: any[] = media.producers;
          const newProductions = updateProductionIds.filter(e => !mediaProductions.includes(e));
          const oldProductions = mediaProductions.filter(e => !updateProductionIds.includes(e));
          media.producers = <any>updateProductionIds;
          await Promise.all([
            this.productionsService.addMediaProductions(media._id, newProductions, session),
            this.productionsService.deleteMediaProductions(media._id, oldProductions, session)
          ]);
        }
        if (updateMediaDto.tags) {
          const updateTagIds = await this.findOrCreateTags(updateMediaDto.tags, authUser._id, session);
          const mediaTags: any[] = media.tags.toObject();
          const newTags = updateTagIds.filter(e => !mediaTags.includes(e));
          const oldTags = mediaTags.filter(e => !updateTagIds.includes(e));
          media.tags = <any>updateTagIds;
          await Promise.all([
            this.tagsService.addMediaTags(media._id, newTags, session),
            this.tagsService.deleteMediaTags(media._id, oldTags, session)
          ]);
        }
        auditLog.getChangesFrom(media, ['slug']);
        await media.save({ session });
      });
    }
    await media.populate([
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'studios', select: { _id: 1, name: 1 } },
      { path: 'producers', select: { _id: 1, name: 1 } },
      { path: 'tags', select: { _id: 1, name: 1, _translations: 1 } },
      {
        path: 'tv.episodes', select: {
          _id: 1, epNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, visibility: 1,
          _translations: 1, createdAt: 1, updatedAt: 1
        }
      },
      { path: 'addedBy', select: { _id: 1, username: 1, nickname: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 } }
    ]);
    const translated = convertToLanguage<Media>(updateMediaDto.translate, media.toObject(), {
      populate: ['genres', 'tags', 'tv.episodes'], keepTranslationsObject: authUser.hasPermission
    });
    const serializedMedia = instanceToPlain(plainToInstance(MediaDetails, translated));
    await this.auditLogService.createLogFromBuilder(auditLog);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${translated._id}`])
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: translated._id,
        media: serializedMedia
      });
    return serializedMedia;
  }

  async remove(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedMedia: Media;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedMedia = await this.mediaModel.findOneAndDelete({ _id: id }, { session }).lean();
      if (!deletedMedia)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      const pullCollectionPromise = deletedMedia.inCollection &&
        this.collectionService.deleteMediaCollection(id, <any>deletedMedia.inCollection, session);
      await Promise.all([
        this.deleteMediaImage(deletedMedia.poster, AzureStorageContainer.POSTERS),
        this.deleteMediaImage(deletedMedia.backdrop, AzureStorageContainer.BACKDROPS),
        this.genresService.deleteMediaGenres(id, <bigint[]><unknown>deletedMedia.genres, session),
        this.productionsService.deleteMediaStudios(id, <bigint[]><unknown>deletedMedia.studios, session),
        this.productionsService.deleteMediaProductions(id, <bigint[]><unknown>deletedMedia.producers, session),
        this.tagsService.deleteMediaTags(id, <bigint[]><unknown>deletedMedia.tags, session),
        this.historyService.deleteMediaHistory(id, session),
        this.ratingsService.deleteMediaRating(id, session),
        pullCollectionPromise
      ]);
      if (deletedMedia.type === MediaType.MOVIE) {
        const deleteSubtitleLimit = pLimit(5);
        await Promise.all(deletedMedia.movie.subtitles.map(subtitle => deleteSubtitleLimit(() => this.deleteMediaSubtitle(subtitle))));
        await Promise.all([
          this.deleteMediaSource(<bigint><unknown>deletedMedia.movie.source, session),
          this.deleteMediaStreams(<bigint[]><unknown>deletedMedia.movie.streams, session)
        ]);
        if (deletedMedia.movie.tJobs?.length)
          await this.videoCancelQueue.add('cancel', { ids: deletedMedia.movie.tJobs.toObject() }, { priority: 1 });
      } else if (deletedMedia.type === MediaType.TV) {
        const deleteEpisodeLimit = pLimit(5);
        await Promise.all(deletedMedia.tv.episodes.map(episodeId =>
          deleteEpisodeLimit(() => this.deleteEpisodeById(<bigint><unknown>episodeId, session))));
      }
      await this.auditLogService.createLog(authUser._id, deletedMedia._id, Media.name, AuditLogType.MEDIA_DELETE);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${deletedMedia._id}`])
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: deletedMedia._id
      });
  }

  async addMediaVideo(id: bigint, addMediaVideoDto: AddMediaVideoDto, headers: HeadersDto, authUser: AuthUserDto) {
    const urlMatch = addMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
    if (!urlMatch || urlMatch[1].length !== 11)
      throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube url' }, HttpStatus.BAD_REQUEST);
    const video = new MediaVideo();
    video._id = await createSnowFlakeId();
    addMediaVideoDto.name && (video.name = addMediaVideoDto.name);
    video.key = urlMatch[1];
    video.site = MediaVideoSite.YOUTUBE;
    video.official = addMediaVideoDto.official;
    const media = await this.mediaModel.findOne({ _id: id }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.videos.find(v => v.key === urlMatch[1]))
      throw new HttpException({ code: StatusCode.MEDIA_VIDEO_EXIST, message: 'This video has already been added' }, HttpStatus.BAD_REQUEST);
    media.videos.push(video);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_CREATE);
    auditLog.getChangesFrom(media);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const videosObject = media.videos.toObject();
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: media._id,
        videos: videosObject
      });
    return videosObject;
  }

  async findAllMediaVideos(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { visibility: 1, videos: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (!media.videos)
      return [];
    const translated = convertToLanguageArray<MediaVideo>(headers.acceptLanguage, media.videos, {
      keepTranslationsObject: authUser.hasPermission
    });
    return translated;
  }

  async updateMediaVideo(id: bigint, videoId: bigint, updateMediaVideoDto: UpdateMediaVideoDto, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, videos: { $elemMatch: { _id: videoId } } }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_UPDATE);
    const videoIndex = media.videos.findIndex(v => v._id === videoId);
    if (updateMediaVideoDto.translate && updateMediaVideoDto?.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateMediaVideoDto.translate}.name`;
      const nameKeyFromRoot = 'videos.' + videoIndex + '.' + nameKey;
      if (updateMediaVideoDto.name !== undefined) {
        media.set(nameKeyFromRoot, updateMediaVideoDto.name);
      }
    } else {
      const targetVideo = media.videos[videoIndex];
      if (updateMediaVideoDto.name !== undefined) {
        targetVideo.name = updateMediaVideoDto.name;
      }
      if (updateMediaVideoDto.url) {
        const urlMatch = updateMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
        if (!urlMatch || urlMatch[1].length !== 11)
          throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube Url' }, HttpStatus.BAD_REQUEST);
        targetVideo.key = urlMatch[1];
      }
      if (updateMediaVideoDto.official != undefined) {
        targetVideo.official = updateMediaVideoDto.official;
      }
    }
    auditLog.getChangesFrom(media);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const videosObject = media.videos.toObject();
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: media._id,
        videos: videosObject
      });
    return videosObject;
  }

  async deleteMediaVideo(id: bigint, videoId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate(
      { _id: id, videos: { $elemMatch: { _id: videoId } } },
      { $pull: { videos: { _id: videoId } } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_DELETE);
    auditLog.appendChange('_id', undefined, videoId);
    await this.auditLogService.createLogFromBuilder(auditLog);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: media._id,
        videos: media.videos
      });
    return media.videos;
  }

  async deleteMediaVideos(id: bigint, deleteMediaVideosDto: DeleteMediaVideosDto, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { 'videos': 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const deleteVideoIds = media.videos.filter(v => deleteMediaVideosDto.ids.includes(v._id)).map(v => v._id);
    const deletedMedia = await this.mediaModel.findOneAndUpdate(
      { _id: id }, { $pull: { videos: { _id: { $in: deleteVideoIds } } } }, { new: true }).lean().exec();
    const auditLog = new AuditLogBuilder(authUser._id, deletedMedia._id, Media.name, AuditLogType.MEDIA_VIDEO_DELETE);
    deleteVideoIds.forEach(id => {
      auditLog.appendChange('_id', undefined, id);
    });
    await this.auditLogService.createLogFromBuilder(auditLog);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${deletedMedia._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: deletedMedia._id,
        videos: deletedMedia.videos
      });
    return deletedMedia.videos;
  }

  async uploadMediaPoster(id: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { poster: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const posterId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${posterId}/${trimmedFilename}`;
    const image = await this.azureBlobService.upload(AzureStorageContainer.POSTERS, saveFile, file.filepath, file.detectedMimetype);
    if (media.poster)
      await this.deleteMediaImage(media.poster, AzureStorageContainer.POSTERS);
    const poster = new MediaFile();
    poster._id = posterId;
    poster.type = MediaFileType.POSTER;
    poster.name = trimmedFilename;
    poster.color = file.color;
    poster.size = image.contentLength;
    poster.mimeType = file.detectedMimetype;
    media.poster = poster;
    try {
      await Promise.all([
        media.save(),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_POSTER_UPDATE)
      ]);
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.POSTERS, saveFile);
      throw e;
    }
    const serializedMedia = instanceToPlain(plainToInstance(MediaDetails, media.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id,
        media: serializedMedia
      });
    return serializedMedia;
  }

  async deleteMediaPoster(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { poster: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.poster) return;
    await this.deleteMediaImage(media.poster, AzureStorageContainer.POSTERS);
    media.poster = undefined;
    await Promise.all([
      media.save(),
      this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_POSTER_DELETE)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
  }

  async uploadMediaBackdrop(id: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { backdrop: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const backdropId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${backdropId}/${trimmedFilename}`;
    const image = await this.azureBlobService.upload(AzureStorageContainer.BACKDROPS, saveFile, file.filepath, file.detectedMimetype);
    if (media.backdrop)
      await this.deleteMediaImage(media.backdrop, AzureStorageContainer.BACKDROPS);
    const backdrop = new MediaFile();
    backdrop._id = backdropId;
    backdrop.type = MediaFileType.BACKDROP;
    backdrop.name = trimmedFilename;
    backdrop.color = file.color;
    backdrop.size = image.contentLength;
    backdrop.mimeType = file.detectedMimetype;
    media.backdrop = backdrop;
    try {
      await Promise.all([
        media.save(),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_BACKDROP_UPDATE)
      ]);
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.BACKDROPS, saveFile);
      throw e;
    }
    const serializedMedia = instanceToPlain(plainToInstance(MediaDetails, media.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id,
        media: serializedMedia
      });
    return serializedMedia;
  }

  async deleteMediaBackdrop(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { backdrop: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.backdrop) return;
    await this.deleteMediaImage(media.backdrop, AzureStorageContainer.BACKDROPS);
    media.backdrop = undefined;
    await Promise.all([
      media.save(),
      this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_BACKDROP_DELETE)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
  }

  private async deleteMediaImage(image: MediaFile, container: string) {
    if (!image) return;
    await this.azureBlobService.delete(container, `${image._id}/${image.name}`);
  }

  async uploadMovieSubtitle(id: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const language = await this.validateSubtitle(file);
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { 'movie.subtitles': 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.subtitles?.length) {
      const subtitle = media.movie.subtitles.find(s => s.lang === language);
      if (subtitle)
        throw new HttpException({ code: StatusCode.SUBTITLE_EXIST, message: 'Subtitle with this language has already been added' }, HttpStatus.BAD_REQUEST);
    }
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SUBTITLE_CREATE);
    const subtitleId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${subtitleId}/${trimmedFilename}`;
    const subtitleFile = await this.azureBlobService.upload(AzureStorageContainer.SUBTITLES, saveFile, file.filepath, file.detectedMimetype);
    const subtitle = new MediaFile();
    subtitle._id = subtitleId;
    subtitle.type = MediaFileType.SUBTITLE;
    subtitle.name = trimmedFilename;
    subtitle.size = subtitleFile.contentLength;
    subtitle.lang = language;
    subtitle.mimeType = file.detectedMimetype;
    media.movie.subtitles.push(subtitle);
    auditLog.getChangesFrom(media, ['type']);
    try {
      await Promise.all([
        media.save(),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, saveFile);
      throw e;
    }
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, media.movie.subtitles.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_SUBTITLES, {
        mediaId: media._id,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async findAllMovieSubtitles(id: bigint, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, {
      visibility: 1, 'movie.subtitles._id': 1, 'movie.subtitles.lang': 1
    }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (!media.movie.subtitles)
      return [];
    return media.movie.subtitles;
  }

  async deleteMovieSubtitle(id: bigint, subtitleId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { 'movie.subtitles': 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const subtitle = media.movie.subtitles.find(s => s._id === subtitleId);
    await this.deleteMediaSubtitle(subtitle);
    media.movie.subtitles.pull({ _id: subtitleId });
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SUBTITLE_DELETE);
    auditLog.appendChange('_id', undefined, subtitleId);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, media.movie.subtitles.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_SUBTITLES, {
        mediaId: media._id,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async deleteMovieSubtitles(id: bigint, deleteMediaSubtitlesDto: DeleteMediaSubtitlesDto, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { 'movie.subtitles': 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const deleteSubtitles = media.movie.subtitles.filter(s => deleteMediaSubtitlesDto.ids.includes(s._id));
    const updatedMedia = await this.mediaModel.findOneAndUpdate(
      { _id: id }, { $pull: { 'movie.subtitles': { _id: { $in: deleteSubtitles.map(s => s._id) } } } }, { new: true })
      .select({ 'movie.subtitles': 1 }).lean().exec();
    const auditLog = new AuditLogBuilder(authUser._id, updatedMedia._id, Media.name, AuditLogType.MOVIE_SUBTITLE_DELETE);
    const deleteSubtitleLimit = pLimit(5);
    await Promise.all(deleteSubtitles.map(subtitle => {
      auditLog.appendChange('_id', undefined, subtitle._id);
      return deleteSubtitleLimit(() => this.deleteMediaSubtitle(subtitle));
    }));
    await this.auditLogService.createLogFromBuilder(auditLog);
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, updatedMedia.movie.subtitles.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${updatedMedia._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_SUBTITLES, {
        mediaId: updatedMedia._id,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async uploadMovieSource(id: bigint, addMediaSourceDto: AddMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { movie: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.BAD_REQUEST);
    const { filename, size, mimeType } = addMediaSourceDto;
    return this.createUploadSourceSession(filename, size, mimeType, authUser._id);
  }

  async encodeMovieSource(id: bigint, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_NOT_FOUND, message: 'Media source not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.status !== MediaSourceStatus.DONE)
      throw new HttpException({ code: StatusCode.MOVIE_ENCODING_UNAVAILABLE, message: 'This feature is currently not available' }, HttpStatus.NOT_FOUND);
    const uploadedSource = await this.mediaStorageModel.findOne({ _id: media.movie.source, user: authUser._id })
      .populate('storage')
      .lean().exec();
    if (!uploadedSource)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_NOT_FOUND, message: 'Media source not found' }, HttpStatus.NOT_FOUND);
    /*
    if (media.movie.streams?.length) {
      // Remove all streams first
      await Promise.all(media.movie.streams.map(id =>
        this.onedriveService.deleteFolder(`${media.movie.source}/${id}`, uploadedSource.storage)));
      media.movie.streams = <Types.Array<MediaStorage>>[];
    }
    */
    const streamSettings = await this.settingsService.findStreamSettings();
    const queueData: MediaQueueDataDto = {
      _id: uploadedSource._id, filename: uploadedSource.name, size: uploadedSource.size, mimeType: uploadedSource.mimeType,
      storage: uploadedSource.storage._id, user: authUser._id, update: true, replaceStreams: <bigint[]><unknown>media.movie.streams
    };
    const addedJobs = await this.createTranscodeQueue(media._id, queueData, streamSettings);
    addedJobs.forEach(j => media.movie.tJobs.push(j.id));
    // Back to ready status
    media.movie.status = MediaSourceStatus.READY;
    await media.save();
    this.wsAdminGateway.server.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.SAVE_MOVIE_SOURCE, {
        mediaId: media._id
      });
  }

  async saveMovieSource(id: bigint, sessionId: bigint, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.CONFLICT);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: <any>authUser._id })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, nickname: 1 })
      .lean().exec();
    if (!uploadSession)
      throw new HttpException({ code: StatusCode.DRIVE_SESSION_NOT_FOUND, message: 'Upload session not found' }, HttpStatus.NOT_FOUND);
    const fileInfo = await this.onedriveService.findId(saveMediaSourceDto.fileId, uploadSession.storage);
    // Validate uploaded file
    if (fileInfo.name !== uploadSession.filename || fileInfo.size != uploadSession.size) {
      await this.onedriveService.deleteFolder(uploadSession._id, uploadSession.storage);
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'You have uploaded an invalid file' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    const auditLog = new AuditLogBuilder(authUser._id, uploadSession._id, MediaStorage.name, AuditLogType.MEDIA_STORAGE_FILE_CREATE);
    const streamSettings = await this.settingsService.findStreamSettings();
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Add original source to media
      const mediaSource = new this.mediaStorageModel({
        _id: uploadSession._id,
        type: MediaStorageType.SOURCE,
        name: uploadSession.filename,
        path: uploadSession._id,
        size: uploadSession.size,
        mimeType: uploadSession.mimeType,
        media: media._id,
        storage: uploadSession.storage._id
      });
      media.movie.source = uploadSession._id;
      media.movie.status = MediaSourceStatus.PROCESSING;
      media.pStatus = MediaPStatus.PROCESSING;
      const queueData: MediaQueueDataDto = {
        _id: uploadSession._id, filename: uploadSession.filename, size: uploadSession.size, mimeType: uploadSession.mimeType,
        storage: uploadSession.storage._id, user: authUser._id
      };
      const addedJobs = await this.createTranscodeQueue(media._id, queueData, streamSettings);
      addedJobs.forEach(j => media.movie.tJobs.push(j.id));
      auditLog.appendChange('type', MediaStorageType.SOURCE);
      auditLog.appendChange('name', uploadSession.filename);
      auditLog.appendChange('path', uploadSession._id);
      auditLog.appendChange('size', uploadSession.size);
      auditLog.appendChange('mimeType', uploadSession.mimeType);
      auditLog.appendChange('storage', uploadSession.storage._id);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(uploadSession.storage._id, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    this.wsAdminGateway.server.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.SAVE_MOVIE_SOURCE, {
        mediaId: media._id
      });
  }

  async deleteMovieSource(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.status === MediaSourceStatus.PENDING)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_NOT_FOUND, message: 'Media source not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.deleteMediaSource(<bigint><unknown>media.movie.source, session),
        this.deleteMediaStreams(<bigint[]><unknown>media.movie.streams, session)
      ]);
      if (media.movie.tJobs.length) {
        await this.videoCancelQueue.add('cancel', { ids: media.movie.tJobs.toObject() }, { priority: 1 });
        media.movie.tJobs = undefined;
      }
      const auditLog = new AuditLogBuilder(authUser._id, <bigint><unknown>media.movie.source, MediaStorage.name, AuditLogType.MEDIA_STORAGE_FILE_DELETE);
      media.movie.tJobs = undefined;
      media.movie.source = undefined;
      media.movie.streams = undefined;
      media.movie.status = MediaSourceStatus.PENDING;
      media.pStatus = MediaPStatus.PENDING;
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.DELETE_MOVIE_SOURCE, {
        mediaId: media._id
      });
  }

  updateMediaSourceData(addMediaStreamDto: AddMediaStreamDto) {
    const updateStorageFilters: FilterQuery<MediaStorageDocument> = {
      _id: addMediaStreamDto.sourceId,
      media: addMediaStreamDto.media
    };
    const updatePromises = [];
    if (addMediaStreamDto.episode) {
      updateStorageFilters.episode = addMediaStreamDto.episode;
      updatePromises.push(
        this.tvEpisodeModel.updateOne({ _id: addMediaStreamDto.episode, media: addMediaStreamDto.media },
          { $set: { runtime: addMediaStreamDto.runtime } }).exec()
      );
    }
    updatePromises.push(
      this.mediaModel.updateOne({ _id: addMediaStreamDto.media, runtime: null },
        { $set: { runtime: addMediaStreamDto.runtime } }).exec()
    );
    updatePromises.push(
      this.mediaStorageModel.updateOne(updateStorageFilters,
        { $set: { quality: addMediaStreamDto.quality } }).exec()
    );
    return Promise.all(updatePromises);
  }

  /*
  async addMovieAudioStream(addMediaStreamDto: AddMediaStreamDto) {
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.onedriveService.findPath(filePath, addMediaStreamDto.storage);
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.MOVIE },
      { _id: 1, movie: 1 }).exec();
    if (!media)
      return;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const fileMimeType = mimeTypes.lookup(addMediaStreamDto.fileName);
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.STREAM_AUDIO,
        name: addMediaStreamDto.fileName,
        path: addMediaStreamDto.sourceId,
        channels: addMediaStreamDto.channels,
        mimeType: fileMimeType,
        size: fileInfo.size,
        media: addMediaStreamDto.media,
        episode: addMediaStreamDto.episode,
        storage: addMediaStreamDto.storage
      });
      media.movie.streams.push(addMediaStreamDto.streamId);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(addMediaStreamDto.storage, addMediaStreamDto.streamId, +fileInfo.size, session),
        stream.save({ session }),
        media.save({ session })
      ]);
    });
  }
  */

  async addMovieStream(addMediaStreamDto: AddMediaStreamDto) {
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.onedriveService.findPath(filePath, addMediaStreamDto.storage);
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.MOVIE },
      { _id: 1, movie: 1, pStatus: 1 }).exec();
    if (!media)
      return;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const fileMimeType = mimeTypes.lookup(addMediaStreamDto.fileName);
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.STREAM,
        name: addMediaStreamDto.fileName,
        path: addMediaStreamDto.sourceId,
        quality: addMediaStreamDto.quality,
        codec: addMediaStreamDto.codec,
        mimeType: fileMimeType,
        size: fileInfo.size,
        media: addMediaStreamDto.media,
        storage: addMediaStreamDto.storage
      });
      media.movie.streams.addToSet(addMediaStreamDto.streamId);
      media.movie.status !== MediaSourceStatus.DONE && (media.movie.status = MediaSourceStatus.READY);
      if (media.pStatus !== MediaPStatus.DONE) {
        media.pStatus = MediaPStatus.DONE;
        this.wsAdminGateway.server.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
          .emit(SocketMessage.ADD_MOVIE_STREAM, {
            mediaId: media._id
          });
      }
      await Promise.all([
        this.externalStoragesService.addFileToStorage(addMediaStreamDto.storage, addMediaStreamDto.streamId, +fileInfo.size, session),
        stream.save({ session }),
        media.save({ session })
      ]);
    });
  }

  async handleMovieStreamQueueDone(jobId: number, infoData: MediaQueueStatusDto) {
    const updateQuery: UpdateQuery<MediaDocument> = { $pull: { 'movie.tJobs': jobId } };
    if (infoData.code !== QueueStatus.CANCELLED_ENCODING || infoData.update) {
      updateQuery.$set = { 'movie.status': MediaSourceStatus.DONE };
    }
    if (infoData.code !== QueueStatus.CANCELLED_ENCODING) {
      // Replace old streams
      if (infoData.replaceStreams?.length) {
        await this.deleteMediaStreams(infoData.replaceStreams);
        updateQuery.$pull['movie.streams'] = { $in: infoData.replaceStreams };
      }
    } else {
      updateQuery.$unset = { 'movie.streams': 1 };
    }
    const media = await this.mediaModel.findOneAndUpdate({ _id: infoData.media }, updateQuery).lean().exec();
    if (infoData.code === QueueStatus.CANCELLED_ENCODING) {
      await this.deleteMediaStreams(<bigint[]><unknown>media.movie.streams);
      return;
    }
    if (!infoData.isPrimary) return;
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${infoData._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_SUCCESS, {
        mediaId: infoData.media
      });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${infoData.media}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: infoData.media
      });
    /*
    this.httpEmailService.sendEmailSendGrid(infoData.user.email, infoData.user.username, 'Your movie is ready',
      SendgridTemplate.MEDIA_PROCESSING_SUCCESS, {
      recipient_name: infoData.user.username,
      button_url: `${this.configService.get('WEBSITE_URL')}/watch/${infoData.media}`
    }).catch(err => {
      console.error(err);
    });
    */
  }

  async handleMovieStreamQueueError(jobId: number, errData: MediaQueueStatusDto) {
    const media = await this.mediaModel.findOne({ _id: errData.media }).exec();
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (media && <bigint><unknown>media.movie?.source === errData._id) {
        await Promise.all([
          this.deleteMediaSource(<bigint><unknown>media.movie.source, session),
          this.deleteMediaStreams(<bigint[]><unknown>media.movie.streams, session)
        ]);
        media.movie.source = undefined;
        media.movie.streams = undefined;
        media.movie.status = MediaSourceStatus.PENDING;
        media.movie.tJobs.pull(jobId);
        media.pStatus = MediaPStatus.PENDING;
        await media.save({ session });
      }
      /*
      await this.httpEmailService.sendEmailSendGrid(errData.user.email, errData.user.username, 'Failed to process your movie',
        SendgridTemplate.MEDIA_PROCESSING_FAILURE, {
        recipient_name: errData.user.username
      });
      */
    });
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${errData._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_FAILURE, {
        mediaId: media._id
      });
    this.wsAdminGateway.server.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
  }

  async findAllMovieStreams(id: bigint, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate({ _id: id, type: MediaType.MOVIE },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1 } }, { timestamps: false })
      .select({ _id: 1, movie: 1, pStatus: 1, visibility: 1 })
      .populate([
        { path: 'movie.source', populate: { path: 'storage', select: { _id: 1, publicUrl: 1, secondPublicUrl: 1 } } },
        { path: 'movie.streams' }
      ])
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (media.pStatus !== MediaPStatus.DONE)
      throw new HttpException({ code: StatusCode.MOVIE_NOT_READY, message: 'Movie is not ready' }, HttpStatus.NOT_FOUND);
    if (!media.movie.streams?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(MediaStream, {
      _id: media._id,
      storage: media.movie.source.storage,
      sourcePath: media.movie.source.path,
      streams: media.movie.streams,
      subtitles: media.movie.subtitles
    });
  }

  async addMovieChapter(id: bigint, addMediaChapterDto: AddMediaChapterDto, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MOVIE_CHAPTER_CREATE);
    const chapter = await this.addMediaChapter(media.movie.chapters, addMediaChapterDto);
    media.movie.chapters.push(chapter);
    auditLog.getChangesFrom(media);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = media.movie.chapters.toObject();
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: media._id,
        chapters: chapters
      });
    return chapters;
  }

  async findAllMovieChapters(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1, visibility: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguageArray<MediaChapter>(headers.acceptLanguage, media.movie.chapters, {
      keepTranslationsObject: authUser.hasPermission
    });
    return translated;
  }

  async updateMovieChapter(id: bigint, chapterId: bigint, updateMediaChapterDto: UpdateMediaChapterDto, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const chapterIndex = media.movie.chapters.findIndex(c => c._id === chapterId);
    if (chapterIndex === -1)
      throw new HttpException({ code: StatusCode.CHAPTER_NOT_FOUND, message: 'Chapter not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MOVIE_CHAPTER_UPDATE);
    if (updateMediaChapterDto.translate && updateMediaChapterDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateMediaChapterDto.translate}.name`;
      const nameKeyFromRoot = 'movie.chapters.' + chapterIndex + '.' + nameKey;
      if (updateMediaChapterDto.name != undefined) {
        media.set(nameKeyFromRoot, updateMediaChapterDto.name);
      }
    } else {
      const targetChapter = media.movie.chapters[chapterIndex];
      if (updateMediaChapterDto.name != undefined) {
        targetChapter.name = updateMediaChapterDto.name;
      }
      if (updateMediaChapterDto.start != undefined) {
        targetChapter.start = updateMediaChapterDto.start;
      }
      if (updateMediaChapterDto.end != undefined) {
        targetChapter.end = updateMediaChapterDto.end;
      }
    }
    auditLog.getChangesFrom(media);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = media.movie.chapters.toObject();
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: media._id,
        chapters: chapters
      });
    return chapters;
  }

  async deleteMovieChapter(id: bigint, chapterId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate({
      _id: id, type: MediaType.MOVIE
    }, { $pull: { 'movie.chapters': { _id: chapterId } } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    await this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_CHAPTER_DELETE);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: media._id,
        chapters: media.movie.chapters
      });
    return media.movie.chapters;
  }

  async deleteMovieChapters(id: bigint, deleteMediaChaptersDto: DeleteMediaChaptersDto, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id }, { 'movie.chapters': 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const deleteChapterIds = media.movie.chapters.filter(v => deleteMediaChaptersDto.ids.includes(v._id)).map(v => v._id);
    const deletedMedia = await this.mediaModel.findOneAndUpdate(
      { _id: id }, { $pull: { 'media.chapters': { _id: { $in: deleteChapterIds } } } }, { new: true }).lean().exec();
    const auditLog = new AuditLogBuilder(authUser._id, deletedMedia._id, Media.name, AuditLogType.MOVIE_CHAPTER_DELETE);
    deleteChapterIds.forEach(id => {
      auditLog.appendChange('_id', undefined, id);
    });
    await this.auditLogService.createLogFromBuilder(auditLog);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${deletedMedia._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: deletedMedia._id,
        chapters: deletedMedia.movie.chapters
      });
    return deletedMedia.movie.chapters;
  }

  async addTVEpisode(id: bigint, addTVEpisodeDto: AddTVEpisodeDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { epNumber, name, overview, runtime, airDate, visibility } = addTVEpisodeDto;
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, tv: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episodeExist = await this.tvEpisodeModel.findOne({ media: id, epNumber: epNumber }).lean().exec();
    if (episodeExist)
      throw new HttpException({ code: StatusCode.EPISODE_NUMBER_EXIST, message: 'Episode number has already been used' }, HttpStatus.BAD_REQUEST);
    let episode: TVEpisodeDocument;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      episode = new this.tvEpisodeModel();
      episode._id = await createSnowFlakeId();
      episode.epNumber = epNumber;
      name && (episode.name = name);
      overview && (episode.overview = overview);
      episode.runtime = runtime;
      episode.airDate = airDate;
      episode.visibility = visibility;
      episode.media = media._id;
      episode.status = MediaSourceStatus.PENDING;
      episode.pStatus = MediaPStatus.PENDING;
      const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CREATE);
      media.tv.episodes.push(episode._id);
      media.tv.episodeCount = media.tv.episodes.length;
      media.tv.lastAirDate = airDate;
      auditLog.getChangesFrom(episode, ['media', 'status', 'pStatus']);
      await Promise.all([
        episode.save({ session }),
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`])
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
    return plainToInstance(TVEpisodeEntity, episode.toObject());
  }

  async findAllTVEpisodes(id: bigint, findEpisodesDto: FindTVEpisodesDto, headers: HeadersDto, authUser: AuthUserDto) {
    const population: PopulateOptions = {
      path: 'tv.episodes',
      select: {
        _id: 1, epNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, visibility: 1,
        _translations: 1, createdAt: 1, updatedAt: 1
      },
      match: {}
    };
    authUser.hasPermission && (population.select.pStatus = 1);
    const { includeHidden, includeUnprocessed } = findEpisodesDto;
    (!authUser.hasPermission || !includeHidden) && (population.match.visibility = MediaVisibility.PUBLIC);
    (!authUser.hasPermission || !includeUnprocessed) && (population.match.pStatus = MediaPStatus.DONE);
    // If the object is empty make it undefined
    !Object.keys(population.match).length && (population.match = undefined);
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { tv: 1 })
      .populate(population)
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguageArray<TVEpisode>(headers.acceptLanguage, media.tv.episodes, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(TVEpisodeEntity, translated);
  }

  async findOneTVEpisode(id: bigint, episodeId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const project: { [key: string]: number } = {
      _id: 1, epNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1,
      chapters: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const match: { [key: string]: any } = { _id: episodeId, media: id };
    if (authUser.hasPermission) {
      project.status = 1;
      project.subtitles = 1;
      project.chapters = 1;
    } else {
      match.pStatus = MediaPStatus.DONE
    }
    const episode = await this.tvEpisodeModel.findOne(match, project).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguage<TVEpisode>(headers.acceptLanguage, episode, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(TVEpisodeDetails, translated);
  }

  async updateTVEpisode(id: bigint, episodeId: bigint, updateTVEpisodeDto: UpdateTVEpisodeDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateTVEpisodeDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, tv: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: id },
      {
        _id: 1, epNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, subtitles: 1,
        chapters: 1, visibility: 1, source: 1, _translations: 1, createdAt: 1, updatedAt: 1
      }
    ).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_UPDATE);
    if (updateTVEpisodeDto.translate && updateTVEpisodeDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateTVEpisodeDto.translate}.name`;
      const overviewKey = `_translations.${updateTVEpisodeDto.translate}.overview`;
      if (updateTVEpisodeDto.name != undefined) {
        episode.set(nameKey, updateTVEpisodeDto.name);
      }
      if (updateTVEpisodeDto.overview != undefined) {
        episode.set(overviewKey, updateTVEpisodeDto.overview);
      }
      auditLog.getChangesFrom(episode, ['status', 'pStatus']);
      await Promise.all([
        episode.save(),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    }
    else {
      const session = await this.mongooseConnection.startSession();
      await session.withTransaction(async () => {
        if (updateTVEpisodeDto.epNumber != undefined && updateTVEpisodeDto.epNumber !== episode.epNumber) {
          const episodeExist = await this.tvEpisodeModel.findOne({ media: id, epNumber: updateTVEpisodeDto.epNumber })
            .lean().exec();
          if (episodeExist)
            throw new HttpException({ code: StatusCode.EPISODE_NUMBER_EXIST, message: 'Episode number has already been used' }, HttpStatus.BAD_REQUEST);
          episode.epNumber = updateTVEpisodeDto.epNumber;
        }
        if (updateTVEpisodeDto.name !== undefined)
          episode.name = updateTVEpisodeDto.name;
        if (updateTVEpisodeDto.overview !== undefined)
          episode.overview = updateTVEpisodeDto.overview;
        if (updateTVEpisodeDto.runtime != undefined)
          episode.runtime = updateTVEpisodeDto.runtime;
        if (updateTVEpisodeDto.airDate != undefined)
          episode.airDate = updateTVEpisodeDto.airDate;
        if (updateTVEpisodeDto.visibility !== undefined)
          episode.visibility = updateTVEpisodeDto.visibility;
        if (episode.isModified('visibility') || episode.isModified('epNumber')) {
          let lastEpisode: TVEpisode;
          if (episode._id === media.tv.lastEpisode) {
            lastEpisode = await this.findLastEpisode(id, false);
            media.tv.lastEpisode = <any>lastEpisode._id;
          }
          if (episode._id === media.tv.pLastEpisode) {
            const publicLastEpisode = media.tv.pLastEpisode === media.tv.lastEpisode ? lastEpisode :
              await this.findLastEpisode(id, true);
            media.tv.pLastEpisode = <any>publicLastEpisode._id;
          }
        }
        auditLog.getChangesFrom(episode, ['status', 'pStatus']);
        await Promise.all([
          episode.save({ session }),
          media.save({ session }),
          this.auditLogService.createLogFromBuilder(auditLog)
        ]);
      });
    }
    const serializedEpisode = instanceToPlain(plainToInstance(TVEpisodeEntity, episode.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`, `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`])
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episode._id,
        episode: serializedEpisode
      });
    return serializedEpisode;
  }

  async deleteTVEpisode(id: bigint, episodeId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, tv: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const episode = await this.deleteEpisodeById(episodeId, session);
      if (!episode)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      media.tv.episodes.pull(episodeId);
      media.tv.episodeCount = media.tv.episodes.length;
      let lastEpisode: TVEpisode;
      if (episode._id === media.tv.lastEpisode) {
        lastEpisode = await this.findLastEpisode(id, false);
        media.tv.lastEpisode = <any>lastEpisode._id;
      }
      if (episode._id === media.tv.pLastEpisode) {
        const publicLastEpisode = media.tv.lastEpisode === media.tv.pLastEpisode ? lastEpisode : await this.findLastEpisode(id, true);
        media.tv.pLastEpisode = <any>publicLastEpisode._id;
      }
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_DELETE)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`, `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`])
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episodeId,
        deleted: true
      });
  }

  private async deleteEpisodeById(episodeId: bigint, session: ClientSession) {
    const episode = await this.tvEpisodeModel.findOneAndDelete({ _id: episodeId }, { session }).lean();
    if (!episode) return;
    await this.deleteMediaImage(episode.still, AzureStorageContainer.STILLS);
    const deleteSubtitleLimit = pLimit(5);
    await Promise.all(episode.subtitles.map(subtitle => deleteSubtitleLimit(() => this.deleteMediaSubtitle(subtitle))));
    await Promise.all([
      this.deleteMediaSource(<bigint><unknown>episode.source, session),
      this.deleteMediaStreams(<bigint[]><unknown>episode.streams, session),
      this.historyService.deleteTVEpisodeHistory(<bigint><unknown>episode.media, episodeId, session)
    ]);
    if (episode.tJobs.length)
      await this.videoCancelQueue.add('cancel', { ids: episode.tJobs }, { priority: 1 });
    return episode;
  }

  async uploadTVEpisodeStill(id: bigint, episodeId: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: id },
      { epNumber: 1, name: 1, overview: 1, runtime: 1, still: 1, airDate: 1, visibility: 1 }
    ).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const stillId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${stillId}/${trimmedFilename}`;
    const image = await this.azureBlobService.upload(AzureStorageContainer.STILLS, saveFile, file.filepath, file.detectedMimetype);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (episode.still)
        await this.deleteMediaImage(episode.still, AzureStorageContainer.STILLS);
      const still = new MediaFile();
      still._id = stillId;
      still.type = MediaFileType.STILL;
      still.name = trimmedFilename;
      still.color = file.color;
      still.size = image.contentLength;
      still.mimeType = file.detectedMimetype;
      episode.still = still;
      try {
        await Promise.all([
          episode.save({ session }),
          this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_STILL_UPDATE)
        ]);
      } catch (e) {
        await this.azureBlobService.delete(AzureStorageContainer.STILLS, saveFile);
        throw e;
      }
    });
    const serializedEpisode = instanceToPlain(plainToInstance(TVEpisodeEntity, episode.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`, `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`])
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episodeId,
        episode: serializedEpisode
      });
    return serializedEpisode;
  }

  async deleteTVEpisodeStill(id: bigint, episodeId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { still: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (!episode.still) return;
      await this.deleteMediaImage(episode.still, AzureStorageContainer.STILLS);
      episode.still = undefined;
      await Promise.all([
        episode.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_STILL_DELETE)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`, `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`])
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episodeId
      });
  }

  async uploadTVEpisodeSubtitle(id: bigint, episodeId: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const language = await this.validateSubtitle(file);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.subtitles?.length) {
      const subtitle = episode.subtitles.find(s => s.lang === language);
      if (subtitle)
        throw new HttpException({ code: StatusCode.SUBTITLE_EXIST, message: 'Subtitle with this language has already been added' }, HttpStatus.BAD_REQUEST);
    }
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SUBTITLE_CREATE);
    const subtitleId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${subtitleId}/${trimmedFilename}`;
    const subtitleFile = await this.azureBlobService.upload(AzureStorageContainer.SUBTITLES, saveFile, file.filepath, file.mimetype);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const subtitle = new MediaFile();
      subtitle._id = subtitleId;
      subtitle.type = MediaFileType.SUBTITLE;
      subtitle.name = trimmedFilename;
      subtitle.size = subtitleFile.contentLength;
      subtitle.lang = language;
      subtitle.mimeType = file.detectedMimetype;
      episode.subtitles.push(subtitle);
      auditLog.getChangesFrom(episode, ['type']);
      try {
        await Promise.all([
          episode.save({ session }),
          this.auditLogService.createLogFromBuilder(auditLog)
        ]);
      } catch (e) {
        await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, saveFile);
        throw e;
      }
    });
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, episode.subtitles.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .emit(SocketMessage.REFRESH_TV_SUBTITLES, {
        mediaId: id,
        episodeId: episodeId,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async findAllTVEpisodeSubtitles(id: bigint, episodeId: bigint, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, {
      visibility: 1, 'subtitles._id': 1, 'subtitles.lang': 1
    }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    if (!episode.subtitles)
      return [];
    return episode.subtitles;
  }

  async deleteTVEpisodeSubtitle(id: bigint, episodeId: bigint, subtitleId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const subtitle = episode.subtitles.find(s => s._id === subtitleId);
      await this.deleteMediaSubtitle(subtitle);
      episode.subtitles.pull({ _id: subtitleId });
      const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SUBTITLE_DELETE);
      auditLog.appendChange('_id', undefined, subtitleId);
      await Promise.all([
        episode.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, episode.subtitles.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .emit(SocketMessage.REFRESH_TV_SUBTITLES, {
        mediaId: id,
        episodeId: episodeId,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async deleteTVEpisodeSubtitles(id: bigint, episodeId: bigint, deleteMediaSubtitlesDto: DeleteMediaSubtitlesDto, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const deleteSubtitles = episode.subtitles.filter(s => deleteMediaSubtitlesDto.ids.includes(s._id));
    const updatedEpisode = await this.tvEpisodeModel.findOneAndUpdate(
      { _id: episodeId, media: <any>id }, { $pull: { subtitles: { _id: { $in: deleteSubtitles.map(s => s._id) } } } }, { new: true })
      .select({ subtitles: 1 }).lean().exec();
    const auditLog = new AuditLogBuilder(authUser._id, updatedEpisode._id, Media.name, AuditLogType.EPISODE_SUBTITLE_DELETE);
    const deleteSubtitleLimit = pLimit(5);
    await Promise.all(deleteSubtitles.map(subtitle => {
      auditLog.appendChange('_id', undefined, subtitle._id);
      return deleteSubtitleLimit(() => this.deleteMediaSubtitle(subtitle));
    }));
    await this.auditLogService.createLogFromBuilder(auditLog);
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, episode.subtitles.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${updatedEpisode._id}`)
      .emit(SocketMessage.REFRESH_TV_SUBTITLES, {
        mediaId: updatedEpisode._id,
        episodeId: episodeId,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async uploadTVEpisodeSource(id: bigint, episodeId: bigint, addMediaSourceDto: AddMediaSourceDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { source: 1 }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.BAD_REQUEST);
    const { filename, size, mimeType } = addMediaSourceDto;
    return this.createUploadSourceSession(filename, size, mimeType, authUser._id);
  }

  async encodeTVEpisodeSource(id: bigint, episodeId: bigint, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (!episode.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_NOT_FOUND, message: 'Media source not found' }, HttpStatus.NOT_FOUND);
    if (episode.status !== MediaSourceStatus.DONE)
      throw new HttpException({ code: StatusCode.EPISODE_ENCODING_UNAVAILABLE, message: 'This feature is currently not available' }, HttpStatus.NOT_FOUND);
    const uploadedSource = await this.mediaStorageModel.findOne({ _id: episode.source })
      .populate('storage')
      .lean().exec();
    if (!uploadedSource)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_NOT_FOUND, message: 'Media source not found' }, HttpStatus.NOT_FOUND);
    const streamSettings = await this.settingsService.findStreamSettings();
    const queueData: MediaQueueDataDto = {
      _id: uploadedSource._id, filename: uploadedSource.name, size: uploadedSource.size, mimeType: uploadedSource.mimeType,
      storage: uploadedSource.storage._id, user: authUser._id, update: true, replaceStreams: <bigint[]><unknown>episode.streams
    };
    const addedJobs = await this.createTranscodeQueue(id, queueData, streamSettings, episodeId);
    addedJobs.forEach(j => episode.tJobs.push(j.id));
    // Back to ready status
    episode.status = MediaSourceStatus.READY;
    await episode.save();
    this.wsAdminGateway.server.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${episode._id}`])
      .emit(SocketMessage.SAVE_MOVIE_SOURCE, {
        mediaId: episode._id
      });
  }

  async saveTVEpisodeSource(id: bigint, episodeId: bigint, sessionId: bigint, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, pStatus: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { _id: 1, source: 1, status: 1, tJobs: 1 })
      .exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.CONFLICT);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: authUser._id })
      .populate('storage')
      .lean().exec();
    if (!uploadSession)
      throw new HttpException({ code: StatusCode.DRIVE_SESSION_NOT_FOUND, message: 'Upload session not found' }, HttpStatus.NOT_FOUND);
    const fileInfo = await this.onedriveService.findId(saveMediaSourceDto.fileId, uploadSession.storage);
    // Validate uploaded file
    if (fileInfo.name !== uploadSession.filename || fileInfo.size != uploadSession.size) {
      await this.onedriveService.deleteFolder(uploadSession._id, uploadSession.storage);
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'You have uploaded an invalid file' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    const auditLog = new AuditLogBuilder(authUser._id, uploadSession._id, MediaStorage.name, AuditLogType.MEDIA_STORAGE_FILE_CREATE);
    const streamSettings = await this.settingsService.findStreamSettings();
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Add original source to media
      const mediaSource = new this.mediaStorageModel({
        _id: uploadSession._id,
        type: MediaStorageType.SOURCE,
        name: uploadSession.filename,
        path: uploadSession._id,
        mimeType: uploadSession.mimeType,
        size: uploadSession.size,
        media: media._id,
        episode: episode._id,
        storage: uploadSession.storage._id
      });
      episode.source = uploadSession._id;
      episode.status = MediaSourceStatus.PROCESSING;
      episode.pStatus = MediaPStatus.PROCESSING;
      media.pStatus !== MediaPStatus.DONE && (media.pStatus = MediaPStatus.PROCESSING);
      const queueData: MediaQueueDataDto = {
        _id: uploadSession._id, filename: uploadSession.filename, size: uploadSession.size, mimeType: uploadSession.mimeType,
        storage: uploadSession.storage._id, user: authUser._id
      };
      const addedJobs = await this.createTranscodeQueue(media._id, queueData, streamSettings, episode._id);
      addedJobs.forEach(j => episode.tJobs.push(j.id));
      auditLog.appendChange('type', MediaStorageType.SOURCE);
      auditLog.appendChange('name', uploadSession.filename);
      auditLog.appendChange('path', uploadSession._id);
      auditLog.appendChange('size', uploadSession.size);
      auditLog.appendChange('mimeType', uploadSession.mimeType);
      auditLog.appendChange('storage', uploadSession.storage._id);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(uploadSession.storage._id, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        episode.save({ session }),
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    this.wsAdminGateway.server
      .to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`, `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`])
      .emit(SocketMessage.SAVE_TV_SOURCE, {
        mediaId: media._id,
        episodeId: episode._id
      });
  }

  async deleteTVEpisodeSource(id: bigint, episodeId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id },
      { _id: 1, source: 1, streams: 1, status: 1, tJobs: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.deleteMediaSource(<bigint><unknown>episode.source, session),
        this.deleteMediaStreams(<bigint[]><unknown>episode.streams, session)
      ]);
      if (episode.tJobs.length) {
        await this.videoCancelQueue.add('cancel', { ids: episode.tJobs }, { priority: 1 });
        episode.tJobs = undefined;
      }
      episode.source = undefined;
      episode.streams = undefined;
      episode.status = MediaSourceStatus.PENDING;
      episode.pStatus = MediaPStatus.PENDING;
      await Promise.all([
        episode.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SOURCE_DELETE)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_MEDIA_LIST, `${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`])
      .to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .emit(SocketMessage.DELETE_TV_SOURCE, {
        mediaId: id,
        episodeId: episodeId
      });
  }

  /*
  async addTVEpisodeAudioStream(addMediaStreamDto: AddMediaStreamDto) {
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.onedriveService.findPath(filePath, addMediaStreamDto.storage);
    const episode = await this.tvEpisodeModel.findOne({ _id: addMediaStreamDto.episode, media: <any>addMediaStreamDto.media },
      { _id: 1, streams: 1 }).exec();
    if (!episode)
      return;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const fileMimeType = mimeTypes.lookup(addMediaStreamDto.fileName);
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.STREAM_AUDIO,
        name: addMediaStreamDto.fileName,
        path: addMediaStreamDto.sourceId,
        channels: addMediaStreamDto.channels,
        mimeType: fileMimeType,
        size: fileInfo.size,
        media: addMediaStreamDto.media,
        episode: addMediaStreamDto.episode,
        storage: addMediaStreamDto.storage
      });
      episode.streams.push(addMediaStreamDto.streamId);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(addMediaStreamDto.storage, addMediaStreamDto.streamId, +fileInfo.size, session),
        stream.save({ session }),
        episode.save({ session })
      ]);
    });
  }
  */

  async addTVEpisodeStream(addMediaStreamDto: AddMediaStreamDto) {
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.onedriveService.findPath(filePath, addMediaStreamDto.storage);
    const epProjection: { [key: string]: 1 | -1 } = { _id: 1, epNumber: 1 };
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.TV },
      { _id: 1, tv: 1, pStatus: 1 })
      .populate([{ path: 'tv.lastEpisode', select: epProjection }, { path: 'tv.pLastEpisode', select: epProjection }])
      .exec();
    const episode = await this.tvEpisodeModel.findOne({ _id: addMediaStreamDto.episode, media: addMediaStreamDto.media },
      { _id: 1, streams: 1, status: 1, pStatus: 1, visibility: 1 }).exec();
    if (!media || !episode)
      return;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const fileMimeType = mimeTypes.lookup(addMediaStreamDto.fileName);
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.STREAM,
        name: addMediaStreamDto.fileName,
        path: addMediaStreamDto.sourceId,
        quality: addMediaStreamDto.quality,
        codec: addMediaStreamDto.codec,
        mimeType: fileMimeType,
        size: fileInfo.size,
        media: addMediaStreamDto.media,
        episode: addMediaStreamDto.episode,
        storage: addMediaStreamDto.storage
      });
      episode.streams.addToSet(addMediaStreamDto.streamId);
      episode.status !== MediaSourceStatus.DONE && (episode.status = MediaSourceStatus.READY);
      if (episode.pStatus !== MediaPStatus.DONE) {
        episode.pStatus = MediaPStatus.DONE;
        if (!media.tv.lastEpisode || media.tv.lastEpisode.epNumber < episode.epNumber) {
          media.depopulate('tv.lastEpisode');
          media.tv.lastEpisode = episode._id;
        }
        if (episode.visibility === MediaVisibility.PUBLIC &&
          (!media.tv.pLastEpisode || media.tv.pLastEpisode.epNumber < episode.epNumber)) {
          media.depopulate('tv.pLastEpisode');
          media.tv.pLastEpisode = episode._id;
        }
      }
      if (media.pStatus !== MediaPStatus.DONE) {
        media.pStatus = MediaPStatus.DONE;
        this.wsAdminGateway.server.to([
          SocketRoom.ADMIN_MEDIA_LIST,
          `${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`,
          `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`
        ]).emit(SocketMessage.ADD_TV_STREAM, {
          mediaId: media._id,
          episodeId: episode._id
        });
      }
      await Promise.all([
        this.externalStoragesService.addFileToStorage(addMediaStreamDto.storage, addMediaStreamDto.streamId, +fileInfo.size, session),
        stream.save({ session }),
        episode.save({ session }),
        media.save({ session })
      ]);
    });
  }

  async handleTVEpisodeStreamQueueDone(jobId: number, infoData: MediaQueueStatusDto) {
    const updateQuery: UpdateQuery<TVEpisodeDocument> = { $pull: { tJobs: jobId } };
    if (infoData.code !== QueueStatus.CANCELLED_ENCODING || infoData.update) {
      updateQuery.$set = { status: MediaSourceStatus.DONE };
    }
    if (infoData.code !== QueueStatus.CANCELLED_ENCODING) {
      if (infoData.replaceStreams?.length) {
        await this.deleteMediaStreams(infoData.replaceStreams);
        updateQuery.$pull['streams'] = { $in: infoData.replaceStreams };
      }
    } else {
      updateQuery.$unset = { streams: 1 };
    }
    const episode = await this.tvEpisodeModel.findOneAndUpdate(
      { _id: infoData.episode, media: infoData.media }, updateQuery).lean().exec();
    if (infoData.code === QueueStatus.CANCELLED_ENCODING) {
      await this.deleteMediaStreams(<bigint[]><unknown>episode.streams);
      return;
    }
    if (!infoData.isPrimary) return;
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${infoData._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_SUCCESS, {
        mediaId: infoData.media,
        epNumber: episode.epNumber
      });
    /*
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${infoData.media}`)
      .to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: infoData.media
      });
    */
    /*
    this.httpEmailService.sendEmailSendGrid(infoData.user.email, infoData.user.username, 'Your episode is ready',
      SendgridTemplate.MEDIA_PROCESSING_SUCCESS, {
      recipient_name: infoData.user.username,
      button_url: `${this.configService.get('WEBSITE_URL')}/watch/${infoData.media}?episode=${episode.epNumber}`
    }).catch(err => {
      console.error(err);
    });
    */
  }

  async handleTVEpisodeStreamQueueError(jobId: number, errData: MediaQueueStatusDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: errData.episode, media: errData.media }).exec();
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (episode && episode.source === <any>errData._id) {
        await Promise.all([
          this.deleteMediaSource(<bigint><unknown>episode.source, session),
          this.deleteMediaStreams(<bigint[]><unknown>episode.streams, session)
        ]);
        episode.source = undefined;
        episode.streams = undefined;
        episode.status = MediaSourceStatus.PENDING;
        episode.pStatus = MediaPStatus.PENDING;
        episode.tJobs.pull(jobId);
        await episode.save({ session });
      }
      /*
      await this.httpEmailService.sendEmailSendGrid(errData.user.email, errData.user.username, 'Failed to process your episode',
        SendgridTemplate.MEDIA_PROCESSING_FAILURE, {
        recipient_name: errData.user.username
      });
      */
    });
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${errData._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_FAILURE, {
        mediaId: errData.media,
        epNumber: episode.epNumber
      });
    this.wsAdminGateway.server.to([
      SocketRoom.ADMIN_MEDIA_LIST,
      `${SocketRoom.ADMIN_MEDIA_DETAILS}:${errData.media}`,
      `${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`
    ]).emit(SocketMessage.REFRESH_MEDIA, {
      mediaId: errData.media
    });
  }

  async findAllTVEpisodeStreams(id: bigint, epNumber: number, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate(
      { _id: id, type: MediaType.TV },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1 } },
      { timestamps: false }
    ).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (media.pStatus !== MediaPStatus.DONE)
      throw new HttpException({ code: StatusCode.TV_NOT_READY, message: 'TV Show is not ready' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOneAndUpdate(
      { media: id, epNumber: epNumber },
      { $inc: { views: 1 } }
    ).populate([
      { path: 'source', populate: { path: 'storage', select: { _id: 1, publicUrl: 1, secondPublicUrl: 1 } } },
      { path: 'streams' }
    ]).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    if (!episode.streams?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(MediaStream, {
      _id: media._id,
      episode: episode,
      storage: episode.source.storage,
      sourcePath: episode.source.path,
      streams: episode.streams,
      subtitles: episode.subtitles
    });
  }

  /*
  private generateHlsPlaylist(streams: MediaStorage[], baseUrl: string) {
    let playlistContent = '#EXTM3U\n#EXT-X-VERSION:7\n';
    let defaultAudio = true;
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      if (stream.type === MediaStorageType.STREAM_AUDIO) {
        const uri = `${baseUrl}/${stream.path}/${stream._id}/${stream.name}`;
        playlistContent += `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio_group",NAME="${stream.channels} Channels",DEFAULT=${defaultAudio},CHANNELS="${stream.channels}",URI="${uri}"\n`;
        defaultAudio && (defaultAudio = false);
      }
      else if (stream.type === MediaStorageType.STREAM) {
        const uri = `${baseUrl}/${stream.path}/${stream._id}/${stream.name}`;
        playlistContent += `#EXT-X-STREAM-INF:BANDWIDTH=3300000,RESOLUTION=${stream.width}x${stream.quality},CODECS="avc1.64001f",AUDIO="audio_group"\n`;
        playlistContent += `${uri}\n`;
      }
    }
    return playlistContent;
  }
  */

  async addTVEpisodeChapter(id: bigint, episodeId: bigint, addMediaChapterDto: AddMediaChapterDto, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { _id: 1, chapters: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CHAPTER_CREATE);
    const chapter = await this.addMediaChapter(episode.chapters, addMediaChapterDto);
    episode.chapters.push(chapter);
    auditLog.getChangesFrom(episode);
    await Promise.all([
      episode.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = episode.chapters.toObject();
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: episode.media,
        episodeId: episode._id,
        chapters: chapters
      });
    return chapters;
  }

  async findAllTVEpisodeChapters(id: bigint, episodeId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { _id: 1, visibility: 1, chapters: 1 })
      .lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguageArray<MediaChapter>(headers.acceptLanguage, episode.chapters);
    return translated;
  }

  async updateTVEpisodeChapter(id: bigint, episodeId: bigint, chapterId: bigint, updateMediaChapterDto: UpdateMediaChapterDto, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { _id: 1, chapters: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const chapterIndex = episode.chapters.findIndex(c => c._id === chapterId);
    if (chapterIndex === -1)
      throw new HttpException({ code: StatusCode.CHAPTER_NOT_FOUND, message: 'Chapter not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CHAPTER_UPDATE);
    if (updateMediaChapterDto.translate && updateMediaChapterDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateMediaChapterDto.translate}.name`;
      const nameKeyFromRoot = 'chapters.' + chapterIndex + '.' + nameKey;
      if (updateMediaChapterDto.name != undefined) {
        episode.set(nameKeyFromRoot, updateMediaChapterDto.name);
      }
    } else {
      const targetChapter = episode.chapters[chapterIndex];
      if (updateMediaChapterDto.name != undefined) {
        targetChapter.name = updateMediaChapterDto.name;
      }
      if (updateMediaChapterDto.start != undefined) {
        targetChapter.start = updateMediaChapterDto.start;
      }
      if (updateMediaChapterDto.end != undefined) {
        targetChapter.end = updateMediaChapterDto.end;
      }
    }
    auditLog.getChangesFrom(episode);
    await Promise.all([
      episode.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = episode.chapters.toObject();
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: episode.media,
        episodeId: episode._id,
        chapters: chapters
      });
    return chapters;
  }

  async deleteTVEpisodeChapter(id: bigint, episodeId: bigint, chapterId: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOneAndUpdate({
      _id: episodeId, media: id
    }, { $pull: { chapters: { _id: chapterId } } }, { new: true }).select({ _id: 1, media: 1, chapters: 1 }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    await this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CHAPTER_DELETE);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: episode.media,
        episodeId: episode._id,
        chapters: episode.chapters
      });
    return episode.chapters;
  }

  async deleteTVEpisodeChapters(id: bigint, episodeId: bigint, deleteMediaChaptersDto: DeleteMediaChaptersDto, headers: HeadersDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, { chapters: 1 }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const deleteChapterIds = episode.chapters.filter(v => deleteMediaChaptersDto.ids.includes(v._id)).map(v => v._id);
    const deletedEpisode = await this.tvEpisodeModel.findOneAndUpdate(
      { _id: episodeId, media: <any>id }, { $pull: { chapters: { _id: { $in: deleteChapterIds } } } }, { new: true }).lean().exec();
    const auditLog = new AuditLogBuilder(authUser._id, deletedEpisode._id, Media.name, AuditLogType.EPISODE_CHAPTER_DELETE);
    deleteChapterIds.forEach(id => {
      auditLog.appendChange('_id', undefined, id);
    });
    await this.auditLogService.createLogFromBuilder(auditLog);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${deletedEpisode._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: deletedEpisode._id,
        episodeId: episode._id,
        chapters: deletedEpisode.chapters
      });
    return deletedEpisode.chapters;
  }

  @Cron('0 0 0 * * *')
  async removeOldUploadSessionsCron() {
    const uploadSessions = await this.driveSessionModel.find({ expiry: { $lte: new Date() } }).populate('storage').lean().exec();
    await this.driveSessionModel.deleteMany({ expiry: { $lte: new Date() } }).exec();
    for (let i = 0; i < uploadSessions.length; i++) {
      await this.onedriveService.deleteFolder(uploadSessions[i]._id, uploadSessions[i].storage);
    }
  }

  @Cron('0 0 * * *')
  async resetDailyViewsCron() {
    await this.mediaModel.updateMany({ dailyViews: { $gt: 0 } }, { dailyViews: 0 }).exec();
  }

  @Cron('0 0 * * 1')
  async resetWeeklyViewsCron() {
    await this.mediaModel.updateMany({ weeklyViews: { $gt: 0 } }, { weeklyViews: 0 }).exec();
  }

  @Cron('0 0 1 * *')
  async resetMonthlyViewsCron() {
    await this.mediaModel.updateMany({ monthlyViews: { $gt: 0 } }, { monthlyViews: 0 }).exec();
  }

  async updateMediaRating(id: bigint, incCount: number, incScore: number, session?: ClientSession) {
    const media = await this.mediaModel.findOne({ _id: id, pStatus: MediaPStatus.DONE }, {
      ratingCount: 1, ratingScore: 1, ratingAverage: 1
    }, { session });
    if (!media) return;
    media.ratingCount += incCount;
    media.ratingScore += incScore;
    // Avoid divine by zero in case rating count is 0
    media.ratingAverage = media.ratingCount === 0 ? 0 : +((media.ratingScore / media.ratingCount).toFixed(1));
    await media.save({ session });
    return media.toObject();
  }

  findOneById(id: bigint, fields?: { [key: string]: any }) {
    return this.mediaModel.findOne({ _id: id }, fields).lean().exec();
  }

  findOneTVEpisodeById(id: bigint, episodeId: bigint, fields?: { [key: string]: any }) {
    return this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, fields).lean().exec();
  }

  findOneTVEpisodeByNumber(id: bigint, epNumber: number, fields?: { [key: string]: any }) {
    return this.tvEpisodeModel.findOne({ media: id, epNumber: epNumber }, fields).lean().exec();
  }

  findAvailableMedia(id: bigint, session?: ClientSession) {
    return this.mediaModel.findOne({ _id: id, pStatus: MediaPStatus.DONE }, {}, { session }).lean();
  }

  async findOneForPlaylist(id: bigint) {
    return this.mediaModel.findOne({ _id: id }, {
      _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pLastEpisode': 1,
      poster: 1, backdrop: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
      pStatus: 1, createdAt: 1, updatedAt: 1
    }).lean().exec();
  }

  private createFindAllParams(paginateMediaDto: OffsetPageMediaDto | CursorPageMediaDto, hasPermission: boolean): [{ [key: string]: number }, { [key: string]: any }] {
    const fields: { [key: string]: number } = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.episodeCount': 1,
      'tv.pLastEpisode': 1, poster: 1, backdrop: 1, genres: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1,
      dailyViews: 1, weeklyViews: 1, monthlyViews: 1, ratingCount: 1, ratingAverage: 1, visibility: 1, _translations: 1,
      createdAt: 1, updatedAt: 1
    };
    const { adult, type, originalLang, year, genres, tags, genreMatch, tagMatch, includeHidden,
      includeUnprocessed } = paginateMediaDto;
    const filters: { [key: string]: any } = {};
    type != undefined && (filters.type = type);
    originalLang != undefined && (filters.originalLang = originalLang);
    year != undefined && (filters['releaseDate.year'] = year);
    adult != undefined && (filters.adult = adult);
    if (Array.isArray(genres)) {
      const genreMatchMode = genreMatch === 'all' ? '$all' : '$in';
      filters.genres = { [genreMatchMode]: genres };
    } else if (genres != undefined) {
      filters.genres = genres;
    }
    if (Array.isArray(tags)) {
      const tagMatchMode = tagMatch === 'all' ? '$all' : '$in';
      filters.tags = { [tagMatchMode]: tags };
    } else if (tags != undefined) {
      filters.tags = tags;
    }
    hasPermission && (fields.pStatus = 1);
    hasPermission && (fields['tv.lastEpisode'] = 1);
    (!hasPermission || !includeHidden) && (filters.visibility = MediaVisibility.PUBLIC);
    (!hasPermission || !includeUnprocessed) && (filters.pStatus = MediaPStatus.DONE);
    return [fields, filters];
  }

  private async updatePublicEpisodeCount(id: bigint) {
    const lastEpisode = await this.findLastEpisode(id, true);
    return this.mediaModel.updateOne({ _id: id }, { 'tv.pLastEpisode': lastEpisode._id }).exec();
  }

  private findLastEpisode(mediaId: bigint, publicOnly: boolean) {
    const filters: FilterQuery<TVEpisodeDocument> = { media: mediaId };
    if (publicOnly)
      filters.visibility = MediaVisibility.PUBLIC;
    return this.tvEpisodeModel.findOne(filters, { _id: 1 }).sort({ epNumber: -1 }).lean().exec();
  }

  // Create new genres and productions start with "create:" keyword, check existing ones by ids
  private async findOrCreateGenres(genres: string[], creatorId: bigint, session: ClientSession) {
    const newGenres = [];
    const existingGenreIds = [];
    for (let i = 0; i < genres.length; i++) {
      if (genres[i].startsWith('create:')) {
        const createGenreQuery = new URLSearchParams(genres[i].substring(7));
        const name = createGenreQuery.get('name');
        if (!name)
          throw new HttpException({ code: StatusCode.IS_NOT_EMPTY, message: 'Genre name must not be empty' }, HttpStatus.BAD_REQUEST);
        if (name.length > 32)
          throw new HttpException({ code: StatusCode.MAX_LENGTH, message: 'Genre name must not be longer than 32 characters' }, HttpStatus.BAD_REQUEST);
        newGenres.push({ name });
      }
      else {
        try {
          existingGenreIds.push(BigInt(genres[i]));
        } catch {
          continue;
        }
      }
    }
    const genreCount = await this.genresService.countByIds(existingGenreIds);
    if (genreCount !== existingGenreIds.length)
      throw new HttpException({ code: StatusCode.GENRES_NOT_FOUND, message: 'Cannot find all the required genres' }, HttpStatus.BAD_REQUEST);
    if (newGenres.length) {
      const createdGenres = await this.genresService.createMany(newGenres, creatorId, session);
      const createdGenreIds = createdGenres.map(g => g._id);
      existingGenreIds.push(...createdGenreIds);
    }
    return existingGenreIds;
  }

  private async findOrCreateProductions(productions: string[], creatorId: bigint, session: ClientSession) {
    const newProductions = [];
    const existingProductionIds = [];
    for (let i = 0; i < productions.length; i++) {
      if (productions[i].startsWith('create:')) {
        const createProductionQuery = new URLSearchParams(productions[i].substring(7));
        const name = createProductionQuery.get('name');
        const country_ = createProductionQuery.get('country');
        const country = country_ && isISO31661Alpha2(country_) ? country_ : null;
        if (!name)
          throw new HttpException({ code: StatusCode.IS_NOT_EMPTY, message: 'Production name must not be empty' }, HttpStatus.BAD_REQUEST);
        if (name.length > 150)
          throw new HttpException({ code: StatusCode.MAX_LENGTH, message: 'Production name must not be longer than 150 characters' }, HttpStatus.BAD_REQUEST);
        newProductions.push({ name, country });
      }
      else {
        try {
          existingProductionIds.push(BigInt(productions[i]));
        } catch {
          continue;
        }
      }
    }
    if (existingProductionIds.length) {
      const productionCount = await this.productionsService.countByIds(existingProductionIds);
      if (productionCount !== existingProductionIds.length)
        throw new HttpException({ code: StatusCode.PRODUCTIONS_NOT_FOUND, message: 'Cannot find all the required productions' }, HttpStatus.BAD_REQUEST);
    }
    if (newProductions.length) {
      const createdProductions = await this.productionsService.createMany(newProductions, creatorId, session);
      const createdProductionIds = createdProductions.map(g => g._id);
      existingProductionIds.push(...createdProductionIds);
    }
    return existingProductionIds;
  }

  private async findOrCreateTags(tags: string[], creatorId: bigint, session: ClientSession) {
    const newTags = [];
    const existingTagIds = [];
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].startsWith('create:')) {
        const createTagQuery = new URLSearchParams(tags[i].substring(7));
        const name = createTagQuery.get('name');
        if (!name)
          throw new HttpException({ code: StatusCode.IS_NOT_EMPTY, message: 'Tag name must not be empty' }, HttpStatus.BAD_REQUEST);
        if (name.length > 32)
          throw new HttpException({ code: StatusCode.MAX_LENGTH, message: 'Tag name must not be longer than 32 characters' }, HttpStatus.BAD_REQUEST);
        newTags.push({ name });
      }
      else {
        try {
          existingTagIds.push(BigInt(tags[i]));
        } catch {
          continue;
        }
      }
    }
    const tagCount = await this.tagsService.countByIds(existingTagIds);
    if (tagCount !== existingTagIds.length)
      throw new HttpException({ code: StatusCode.TAGS_NOT_FOUND, message: 'Cannot find all the required tags' }, HttpStatus.BAD_REQUEST);
    if (newTags.length) {
      const createdTags = await this.tagsService.createMany(newTags, creatorId, session);
      const createdTagIds = createdTags.map(t => t._id);
      existingTagIds.push(...createdTagIds);
    }
    return existingTagIds;
  }

  private async validateSubtitle(file: Storage.MultipartFile) {
    if (!file.fields.language)
      throw new HttpException({ code: StatusCode.IS_NOT_EMPTY, message: 'Language is required' }, HttpStatus.BAD_REQUEST);
    const language = file.fields.language['value'];
    if (!ISO6391.validate(language))
      throw new HttpException({ code: StatusCode.IS_ISO6391, message: 'Language must be an ISO6391 code' }, HttpStatus.BAD_REQUEST);
    if (!file.filename.endsWith('.vtt') && !file.filename.endsWith('.srt') && !file.filename.endsWith('.ass'))
      throw new HttpException({ code: StatusCode.INVALID_SUBTITLE, message: 'Subtitle is invalid' }, HttpStatus.BAD_REQUEST);
    //const firstLine = await readFirstLine(file.filepath);
    //if (!firstLine.includes('WEBVTT'))
    //  throw new HttpException({ code: StatusCode.INVALID_SUBTITLE, message: 'Subtitle is invalid' }, HttpStatus.BAD_REQUEST);
    return language;
  }

  private async deleteMediaSubtitle(subtitle: MediaFile) {
    if (!subtitle) return;
    await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, `${subtitle._id}/${subtitle.name}`);
  }

  private async createUploadSourceSession(filename: string, size: number, mimeType: string, userId: bigint) {
    const trimmedFilename = trimSlugFilename(filename);
    const driveSession = new this.driveSessionModel();
    driveSession._id = await createSnowFlakeId();
    driveSession.filename = trimmedFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>userId;
    driveSession.expiry = new Date(Date.now() + 86400000);
    const uploadSession = await this.onedriveService.createUploadSession(trimmedFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  private createTranscodeQueue(mediaId: bigint, queueData: MediaQueueDataDto, streamSettings: Setting, episodeId?: bigint) {
    // Create transcode queue
    const jobs = [];
    for (let i = 0; i < STREAM_CODECS.length; i++) {
      if (streamSettings.defaultStreamCodecs & STREAM_CODECS[i]) {
        jobs.push({
          name: STREAM_CODECS[i].toString(),
          data: {
            ...queueData,
            media: mediaId,
            episode: episodeId,
            audioParams: streamSettings.streamAudioParams,
            audio2Params: streamSettings.streamAudio2Params,
            h264Params: streamSettings.streamH264Params,
            vp9Params: streamSettings.streamVP9Params,
            av1Params: streamSettings.streamAV1Params,
            qualityList: streamSettings.streamQualityList,
            encodingSettings: streamSettings.streamEncodingSettings,
            // First codec is the primary job
            isPrimary: i === 0
          },
          opts: {
            // Codec order affects priority
            priority: i + 1
          }
        });
      }
    }
    return this.videoTranscodeQueue.addBulk(jobs);
  }

  private async deleteMediaSource(id: bigint, session?: ClientSession) {
    if (!id)
      return;
    const source = await this.mediaStorageModel.findOneAndDelete({ _id: id }, { session }).populate('storage').lean();
    if (source) {
      await this.externalStoragesService.deleteFileFromStorage(source.storage._id, id, source.size, session);
      this.onedriveService.deleteFolder(id, source.storage, 5)
    }
  }

  private async deleteMediaStreams(ids: bigint[], session?: ClientSession) {
    if (!Array.isArray(ids))
      return;
    for (let i = 0; i < ids.length; i++) {
      const source = await this.mediaStorageModel.findOneAndDelete({ _id: ids[i] }, { session }).lean();
      if (source)
        await this.externalStoragesService.deleteFileFromStorage(<any>source.storage, ids[i], source.size, session);
    }
  }

  private async addMediaChapter(chapters: Types.Array<MediaChapter>, addMediaChapterDto: AddMediaChapterDto) {
    const checkChapter = chapters.find(c => c.start === addMediaChapterDto.start && c.end === addMediaChapterDto.end);
    if (checkChapter)
      throw new HttpException({ code: StatusCode.CHAPTER_DUPLICATED, message: 'Duplicated start and end time' }, HttpStatus.CONFLICT);
    const chapter = new MediaChapter();
    chapter._id = await createSnowFlakeId();
    chapter.name = addMediaChapterDto.name;
    chapter.start = addMediaChapterDto.start;
    chapter.end = addMediaChapterDto.end;
    return chapter;
  }

  deleteGenreMedia(genreId: bigint, mediaIds: bigint[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { genres: genreId } }, { session });
  }

  deleteProductionMedia(productionId: bigint, mediaIds: bigint[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { studios: productionId, producers: productionId } }, { session });
  }

  deleteCollectionMedia(mediaIds: bigint[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { inCollection: null }, { session });
  }

  deleteTagMedia(tagId: bigint, mediaIds: bigint[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { tags: tagId } }, { session });
  }
}
