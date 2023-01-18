import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, LeanDocument, Model, PopulateOptions, Types, UpdateQuery } from 'mongoose';
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

import { CreateMediaDto, UpdateMediaDto, AddMediaVideoDto, UpdateMediaVideoDto, PaginateMediaDto, AddMediaSourceDto, AddMediaStreamDto, MediaQueueStatusDto, SaveMediaSourceDto, FindTVEpisodesDto, AddTVEpisodeDto, UpdateTVEpisodeDto, AddMediaChapterDto, UpdateMediaChapterDto, FindMediaDto } from './dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { Media, MediaDocument, MediaStorage, MediaStorageDocument, MediaFile, DriveSession, DriveSessionDocument, Movie, TVShow, TVEpisode, TVEpisodeDocument, MediaVideo, MediaChapter, Setting, MediaExternalStreams } from '../../schemas';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GenresService } from '../genres/genres.service';
import { ProductionsService } from '../productions/productions.service';
import { TagsService } from '../tags/tags.service';
import { CollectionService } from '../collection/collection.service';
import { HistoryService } from '../history/history.service';
import { PlaylistsService } from '../playlists/playlists.service';
import { SettingsService } from '../settings/settings.service';
import { AzureBlobService } from '../../common/modules/azure-blob/azure-blob.service';
import { OnedriveService } from '../../common/modules/onedrive/onedrive.service';
import { ExternalStreamService } from '../../common/modules/external-stream/external-stream.service';
import { Redis2ndCacheService } from '../../common/modules/redis-2nd-cache/redis-2nd-cache.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { WsAdminGateway } from '../ws-admin';
import { Paginated } from '../../common/entities';
import { Media as MediaEntity, MediaDetails, MediaSubtitle, MediaStream, TVEpisode as TVEpisodeEntity, TVEpisodeDetails } from './entities';
import { LookupOptions, MongooseOffsetPagination, convertToLanguage, convertToLanguageArray, createSnowFlakeId, readFirstLine, trimSlugFilename, isEmptyObject, isEqualShallow, AuditLogBuilder } from '../../utils';
import { MediaType, MediaVideoSite, StatusCode, MongooseConnection, TaskQueue, MediaStorageType, MediaPStatus, MediaSourceStatus, AzureStorageContainer, AuditLogType, MediaFileType, MediaVisibility, QueueStatus, SocketMessage, SocketRoom, CachePrefix } from '../../enums';
import { I18N_DEFAULT_LANGUAGE, STREAM_CODECS } from '../../config';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name, MongooseConnection.DATABASE_A) private mediaModel: Model<MediaDocument>,
    @InjectModel(MediaStorage.name, MongooseConnection.DATABASE_A) private mediaStorageModel: Model<MediaStorageDocument>,
    @InjectModel(DriveSession.name, MongooseConnection.DATABASE_A) private driveSessionModel: Model<DriveSessionDocument>,
    @InjectModel(TVEpisode.name, MongooseConnection.DATABASE_A) private tvEpisodeModel: Model<TVEpisodeDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection, @InjectQueue(TaskQueue.VIDEO_TRANSCODE) private videoTranscodeQueue: Queue,
    @InjectQueue(TaskQueue.VIDEO_CANCEL) private videoCancelQueue: Queue,
    @Inject(forwardRef(() => GenresService)) private genresService: GenresService,
    @Inject(forwardRef(() => ProductionsService)) private productionsService: ProductionsService,
    @Inject(forwardRef(() => TagsService)) private tagsService: TagsService,
    @Inject(forwardRef(() => CollectionService)) private collectionService: CollectionService,
    @Inject(forwardRef(() => HistoryService)) private historyService: HistoryService,
    @Inject(forwardRef(() => PlaylistsService)) private playlistsService: PlaylistsService,
    private auditLogService: AuditLogService,
    private externalStoragesService: ExternalStoragesService, private settingsService: SettingsService,
    private wsAdminGateway: WsAdminGateway, private onedriveService: OnedriveService,
    private externalStreamService: ExternalStreamService, private azureBlobService: AzureBlobService,
    private redis2ndCacheService: Redis2ndCacheService) { }

  async create(createMediaDto: CreateMediaDto, authUser: AuthUserDto) {
    const { type, title, originalTitle, overview, originalLanguage, runtime, adult, releaseDate, lastAirDate, status,
      visibility, externalIds, scanner, extStreams } = createMediaDto;
    const slug = !originalTitle || originalTitle.toLowerCase() === title.toLowerCase() ?
      slugify(removeAccents(title), { lower: true }) :
      slugify(removeAccents(`${title} ${originalTitle}`), { lower: true });
    const media = new this.mediaModel({
      type, title, originalTitle, slug, overview, originalLanguage, runtime, adult, releaseDate, status,
      visibility, pStatus: MediaPStatus.PENDING, externalIds, scanner, addedBy: authUser._id
    });
    media._id = await createSnowFlakeId();
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_CREATE);
    auditLog.appendChange('type', type);
    auditLog.appendChange('title', title);
    auditLog.appendChange('overview', overview);
    auditLog.appendChange('runtime', runtime);
    auditLog.appendChange('adult', adult);
    auditLog.appendChange('releaseDate.day', releaseDate.day);
    auditLog.appendChange('releaseDate.month', releaseDate.month);
    auditLog.appendChange('releaseDate.year', releaseDate.year);
    auditLog.appendChange('status', status);
    auditLog.appendChange('visibility', visibility);
    originalTitle && auditLog.appendChange('originalTitle', originalTitle);
    originalLanguage && auditLog.appendChange('originalLanguage', originalLanguage);
    if (externalIds) {
      externalIds.imdb && auditLog.appendChange('externalIds.imdb', externalIds.imdb);
      externalIds.tmdb && auditLog.appendChange('externalIds.tmdb', externalIds.tmdb);
      externalIds.aniList && auditLog.appendChange('externalIds.aniList', externalIds.aniList);
      externalIds.mal && auditLog.appendChange('externalIds.mal', externalIds.mal);
    }
    if (scanner) {
      auditLog.appendChange('scanner.enabled', scanner.enabled);
      scanner.tvSeason && auditLog.appendChange('scanner.tvSeason', scanner.tvSeason);
    }
    if (createMediaDto.type === MediaType.MOVIE) {
      media.movie = new Movie();
      media.movie.status = MediaSourceStatus.PENDING;
      if (extStreams && !isEmptyObject(extStreams)) {
        media.movie.extStreams = extStreams;
        extStreams.gogoanimeId && auditLog.appendChange('movie.extStreams.gogoanimeId', extStreams.gogoanimeId);
        extStreams.flixHQId && auditLog.appendChange('movie.extStreams.flixHQId', extStreams.flixHQId);
        extStreams.zoroId && auditLog.appendChange('movie.extStreams.zoroId', extStreams.zoroId);
        media.pStatus = MediaPStatus.DONE;
      }
    }
    else if (createMediaDto.type === MediaType.TV) {
      media.tv = new TVShow();
      if (lastAirDate) {
        media.tv.lastAirDate = lastAirDate;
        auditLog.appendChange('tv.lastAirDate.year', lastAirDate.year);
        auditLog.appendChange('tv.lastAirDate.month', lastAirDate.month);
        auditLog.appendChange('tv.lastAirDate.day', lastAirDate.day);
      }
    }
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (createMediaDto.genres) {
        const genreIds = await this.findOrCreateGenres(createMediaDto.genres, session);
        media.genres = <any>genreIds;
        await this.genresService.addMediaGenres(media._id, genreIds, session);
        genreIds.forEach(id => {
          auditLog.appendChange('genres', id);
        });
      }
      if (createMediaDto.productions) {
        const productionIds = await this.findOrCreateProductions(createMediaDto.productions, session);
        media.productions = <any>productionIds;
        await this.productionsService.addMediaProductions(media._id, productionIds, session);
        productionIds.forEach(id => {
          auditLog.appendChange('productions', id);
        });
      }
      if (createMediaDto.tags) {
        const tagIds = await this.findOrCreateTags(createMediaDto.tags, session);
        media.tags = <any>tagIds;
        await this.tagsService.addMediaTags(media._id, tagIds, session);
        tagIds.forEach(id => {
          auditLog.appendChange('tags', id);
        });
      }
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    await media.populate([{ path: 'genres', select: { _id: 1, name: 1 } }, { path: 'productions', select: { _id: 1, name: 1 } }]);
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA);
    return plainToInstance(MediaDetails, media.toObject());
  }

  async findAll(paginateMediaDto: PaginateMediaDto, acceptLanguage: string, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'title', 'originalLanguage', 'releaseDate.year', 'views', 'dailyViews', 'weeklyViews', 'monthlyViews',
      'ratingAverage', 'createdAt', 'updatedAt'];
    const fields: { [key: string]: number } = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.episodeCount': 1,
      'tv.pEpisodeCount': 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1,
      dailyViews: 1, weeklyViews: 1, monthlyViews: 1, ratingCount: 1, ratingAverage: 1, visibility: 1, _translations: 1,
      createdAt: 1, updatedAt: 1
    };
    const { adult, page, limit, sort, search, type, originalLanguage, year, genres, includeHidden, includeUnprocessed } = paginateMediaDto;
    const filters: { [key: string]: any } = {};
    type != undefined && (filters.type = type);
    originalLanguage != undefined && (filters.originalLanguage = originalLanguage);
    year != undefined && (filters['releaseDate.year'] = year);
    adult != undefined && (filters.adult = adult);
    if (Array.isArray(genres))
      filters.genres = { $in: genres };
    else if (genres != undefined)
      filters.genres = genres;
    authUser.hasPermission && (fields.pStatus = 1);
    (!authUser.hasPermission || !includeHidden) && (filters.visibility = MediaVisibility.PUBLIC);
    (!authUser.hasPermission || !includeUnprocessed) && (filters.pStatus = MediaPStatus.DONE);
    const aggregation = new MongooseOffsetPagination({ page, limit, fields, sortQuery: sort, search, sortEnum, fullTextSearch: true });
    Object.keys(filters).length && (aggregation.filters = filters);
    const lookups: LookupOptions[] = [{
      from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
      project: { _id: 1, name: 1, _translations: 1 }
    }];
    const pipeline = aggregation.buildLookup(lookups);
    const [data] = await this.mediaModel.aggregate(pipeline).exec();
    let mediaList = new Paginated<MediaEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<MediaEntity>(acceptLanguage, data.results, {
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

  async findOne(id: string, acceptLanguage: string, findMediaDto: FindMediaDto, authUser: AuthUserDto) {
    const project: { [key: string]: number } = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
      productions: 1, credits: 1, runtime: 1, videos: 1, adult: 1, releaseDate: 1, status: 1, externalIds: 1,
      views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1, ratingCount: 1, ratingScore: 1, ratingAverage: 1, visibility: 1,
      _translations: 1, createdAt: 1, updatedAt: 1, 'tv.pEpisodeCount': 1, 'tv.lastAirDate': 1, 'tv.episodes': 1
    };
    const population: PopulateOptions[] = [
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'productions', select: { _id: 1, name: 1 } }
    ];
    if (authUser.hasPermission) {
      project.scanner = 1;
      project.pStatus = 1;
      project.addedBy = 1;
      project['movie.subtitles'] = 1;
      project['movie.chapters'] = 1;
      project['movie.status'] = 1;
      project['movie.extStreams'] = 1;
      project['tv.episodeCount'] = 1;
      population.push({
        path: 'addedBy',
        select: { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 }
      });
    }
    const episodePopulation: PopulateOptions = {
      path: 'tv.episodes', select: {
        _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, visibility: 1,
        _translations: 1, createdAt: 1, updatedAt: 1
      }, match: {}
    };
    authUser.hasPermission && (episodePopulation.select.pStatus = 1);
    if (!authUser.hasPermission || !findMediaDto.includeHiddenEps)
      episodePopulation.match.pStatus = MediaPStatus.DONE;
    if (!authUser.hasPermission || !findMediaDto.includeUnprocessedEps)
      episodePopulation.match.visibility = MediaVisibility.PUBLIC;
    population.push(episodePopulation);
    const media = await this.mediaModel.findById(id, project).populate(population).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguage<LeanDocument<Media>>(acceptLanguage, media, {
      populate: ['genres', 'tv.episodes', 'videos'], keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(MediaDetails, translated);
  }

  async update(id: string, updateMediaDto: UpdateMediaDto, authUser: AuthUserDto) {
    if (!Object.keys(updateMediaDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const media = await this.mediaModel.findById(id, {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, genres: 1, originalLanguage: 1,
      productions: 1, credits: 1, runtime: 1, videos: 1, adult: 1, releaseDate: 1, status: 1, externalIds: 1,
      ratingCount: 1, ratingAverage: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1, movie: 1,
      'tv.episodeCount': 1, 'tv.pEpisodeCount': 1, 'tv.lastAirDate': 1, scanner: 1
    }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_UPDATE);
    if (updateMediaDto.translate && updateMediaDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const titleKey = `_translations.${updateMediaDto.translate}.title`;
      const oldTitle = media.get(titleKey);
      if (updateMediaDto.title && updateMediaDto.title !== oldTitle) {
        auditLog.appendChange(titleKey, updateMediaDto.title, media.get(titleKey));
        media.set(titleKey, updateMediaDto.title);
      }
      const overviewKey = `_translations.${updateMediaDto.translate}.overview`;
      const oldOverview = media.get(overviewKey);
      if (updateMediaDto.overview && updateMediaDto.overview !== oldOverview) {
        auditLog.appendChange(overviewKey, updateMediaDto.overview, media.get(overviewKey));
        media.set(overviewKey, updateMediaDto.overview);
      }
      const slug = slugify(removeAccents(updateMediaDto.title), { lower: true, locale: updateMediaDto.translate });
      media.set(`_translations.${updateMediaDto.translate}.slug`, slug || null);
      await media.save();
    }
    else {
      const session = await this.mongooseConnection.startSession();
      await session.withTransaction(async () => {
        if (updateMediaDto.title && media.title !== updateMediaDto.title) {
          auditLog.appendChange('title', updateMediaDto.title, media.title);
          media.title = updateMediaDto.title;
        };
        if (updateMediaDto.originalTitle !== undefined && media.originalTitle !== updateMediaDto.originalTitle) {
          auditLog.appendChange('originalTitle', updateMediaDto.originalTitle, media.originalTitle);
          media.originalTitle = updateMediaDto.originalTitle;
        }
        if (updateMediaDto.overview && media.overview !== updateMediaDto.overview) {
          auditLog.appendChange('overview', updateMediaDto.overview, media.overview);
          media.overview = updateMediaDto.overview;
        }
        if (updateMediaDto.originalLanguage !== undefined && media.originalLanguage !== updateMediaDto.originalLanguage) {
          auditLog.appendChange('originalLanguage', updateMediaDto.originalLanguage, media.originalLanguage);
          media.originalLanguage = updateMediaDto.originalLanguage;
        }
        if (updateMediaDto.runtime != undefined && media.runtime !== updateMediaDto.runtime) {
          auditLog.appendChange('runtime', updateMediaDto.runtime, media.runtime);
          media.runtime = updateMediaDto.runtime;
        }
        if (updateMediaDto.visibility != undefined && media.visibility !== updateMediaDto.visibility) {
          auditLog.appendChange('visibility', updateMediaDto.visibility, media.visibility);
          media.visibility = updateMediaDto.visibility;
        }
        if (updateMediaDto.adult != undefined && media.adult !== updateMediaDto.adult) {
          auditLog.appendChange('adult', updateMediaDto.adult, media.adult);
          media.adult = updateMediaDto.adult;
        }
        if (updateMediaDto.status != undefined && media.status !== updateMediaDto.status) {
          auditLog.appendChange('status', updateMediaDto.status, media.status);
          media.status = updateMediaDto.status;
        }
        if (updateMediaDto.releaseDate != undefined && !isEqualShallow(updateMediaDto.releaseDate, media.releaseDate)) {
          auditLog.appendChange('releaseDate.day', updateMediaDto.releaseDate.day, media.releaseDate.day);
          auditLog.appendChange('releaseDate.month', updateMediaDto.releaseDate.month, media.releaseDate.month);
          auditLog.appendChange('releaseDate.year', updateMediaDto.releaseDate.year, media.releaseDate.year);
          media.releaseDate = updateMediaDto.releaseDate;
        }
        if (updateMediaDto.lastAirDate !== undefined && media.type === MediaType.TV &&
          !isEqualShallow(updateMediaDto.lastAirDate, media.tv.lastAirDate)) {
          auditLog.appendChange('tv.lastAirDate.day', updateMediaDto.lastAirDate?.day, media.tv.lastAirDate?.day);
          auditLog.appendChange('tv.lastAirDate.month', updateMediaDto.lastAirDate?.month, media.tv.lastAirDate?.month);
          auditLog.appendChange('tv.lastAirDate.year', updateMediaDto.lastAirDate?.year, media.tv.lastAirDate?.year);
          media.tv.lastAirDate = updateMediaDto.lastAirDate;
        }
        if (updateMediaDto.externalIds) {
          if (updateMediaDto.externalIds.imdb && updateMediaDto.externalIds.imdb !== media.externalIds?.imdb) {
            auditLog.appendChange('externalIds.imdb', updateMediaDto.externalIds.imdb, media.externalIds?.imdb);
            media.set('externalIds.imdb', updateMediaDto.externalIds.imdb);
          }
          if (updateMediaDto.externalIds.tmdb != undefined && updateMediaDto.externalIds.tmdb !== media.externalIds?.tmdb) {
            auditLog.appendChange('externalIds.tmdb', updateMediaDto.externalIds.tmdb, media.externalIds?.tmdb);
            media.set('externalIds.tmdb', updateMediaDto.externalIds.tmdb);
          }
          if (updateMediaDto.externalIds.aniList != undefined && updateMediaDto.externalIds.aniList !== media.externalIds?.aniList) {
            auditLog.appendChange('externalIds.aniList', updateMediaDto.externalIds.aniList, media.externalIds?.aniList);
            media.set('externalIds.aniList', updateMediaDto.externalIds.aniList);
          }
          if (updateMediaDto.externalIds.mal != undefined && updateMediaDto.externalIds.mal !== media.externalIds?.mal) {
            auditLog.appendChange('externalIds.mal', updateMediaDto.externalIds.mal, media.externalIds?.mal);
            media.set('externalIds.mal', updateMediaDto.externalIds.mal);
          }
        }
        if (updateMediaDto.extStreams && media.type === MediaType.MOVIE) {
          if (updateMediaDto.extStreams.gogoanimeId && updateMediaDto.extStreams.gogoanimeId !== media.movie.extStreams.gogoanimeId) {
            auditLog.appendChange('movie.extStreams.gogoanimeId', updateMediaDto.extStreams.gogoanimeId, media.movie.extStreams.gogoanimeId);
            media.set('movie.extStreams.gogoanimeId', updateMediaDto.extStreams.gogoanimeId);
          }
          if (updateMediaDto.extStreams.flixHQId != undefined && updateMediaDto.extStreams.flixHQId !== media.movie.extStreams.flixHQId) {
            auditLog.appendChange('movie.extStreams.flixHQId', updateMediaDto.extStreams.flixHQId, media.movie.extStreams.flixHQId);
            media.set('movie.extStreams.flixHQId', updateMediaDto.extStreams.flixHQId);
          }
          if (updateMediaDto.extStreams.zoroId && updateMediaDto.extStreams.zoroId !== media.movie.extStreams.zoroId) {
            auditLog.appendChange('movie.extStreams.zoroId', updateMediaDto.extStreams.zoroId, media.movie.extStreams.zoroId);
            media.set('movie.extStreams.zoroId', updateMediaDto.extStreams.zoroId);
          }
          if (!media.movie.source) {
            const mediaPlain = media.toObject();
            media.pStatus = isEmptyObject(mediaPlain.movie.extStreams) ? MediaPStatus.PENDING : MediaPStatus.DONE;
          }
          // Clear external stream urls cache
          await this.clearExtStreamUrlsCache(media._id);
        }
        if (updateMediaDto.scanner) {
          if (updateMediaDto.scanner.enabled != undefined && updateMediaDto.scanner.enabled !== media.scanner?.enabled) {
            auditLog.appendChange('scanner.enabled', updateMediaDto.scanner.enabled, media.scanner?.enabled);
            media.set('scanner.enabled', updateMediaDto.scanner.enabled);
          }
          if (updateMediaDto.scanner.tvSeason !== undefined && media.type === MediaType.TV
            && updateMediaDto.scanner.tvSeason !== media.scanner?.tvSeason) {
            auditLog.appendChange('scanner.tvSeason', updateMediaDto.scanner.tvSeason, media.scanner?.tvSeason);
            media.set('scanner.tvSeason', updateMediaDto.scanner.tvSeason);
          }
        }
        if (updateMediaDto.title || updateMediaDto.originalTitle !== undefined) {
          const slug = !media.originalTitle || media.originalTitle?.toLowerCase() === media.title.toLowerCase() ?
            slugify(removeAccents(media.title), { lower: true }) :
            slugify(removeAccents(`${media.title} ${media.originalTitle}`), { lower: true });
          media.slug = slug;
        }
        if (updateMediaDto.genres) {
          const updateGenreIds = await this.findOrCreateGenres(updateMediaDto.genres, session);
          const mediaGenres: any[] = media.genres.toObject();
          const newGenres = updateGenreIds.filter(e => !mediaGenres.includes(e));
          const oldGenres = mediaGenres.filter(e => !updateGenreIds.includes(e));
          media.genres = <any>updateGenreIds;
          oldGenres.forEach(id => {
            auditLog.appendChange('genres', undefined, id);
          });
          newGenres.forEach(id => {
            auditLog.appendChange('genres', id);
          });
          await Promise.all([
            this.genresService.addMediaGenres(media._id, newGenres, session),
            this.genresService.deleteMediaGenres(media._id, oldGenres, session)
          ]);
        }
        if (updateMediaDto.productions) {
          const updateProductionIds = await this.findOrCreateProductions(updateMediaDto.productions, session);
          const mediaProductions: any[] = media.productions;
          const newProductions = updateProductionIds.filter(e => !mediaProductions.includes(e));
          const oldProductions = mediaProductions.filter(e => !updateProductionIds.includes(e));
          media.productions = <any>updateProductionIds;
          newProductions.forEach(id => {
            auditLog.appendChange('productions', undefined, id);
          });
          oldProductions.forEach(id => {
            auditLog.appendChange('productions', id);
          });
          await Promise.all([
            this.productionsService.addMediaProductions(media._id, newProductions, session),
            this.productionsService.deleteMediaProductions(media._id, oldProductions, session)
          ]);
        }
        if (updateMediaDto.tags) {
          const updateTagIds = await this.findOrCreateTags(updateMediaDto.tags, session);
          const mediaTags: any[] = media.tags.toObject();
          const newTags = updateTagIds.filter(e => !mediaTags.includes(e));
          const oldTags = mediaTags.filter(e => !updateTagIds.includes(e));
          media.tags = <any>updateTagIds;
          oldTags.forEach(id => {
            auditLog.appendChange('tags', undefined, id);
          });
          newTags.forEach(id => {
            auditLog.appendChange('tags', id);
          });
          await Promise.all([
            this.tagsService.addMediaTags(media._id, newTags, session),
            this.tagsService.deleteMediaTags(media._id, oldTags, session)
          ]);
        }
        await media.save({ session });
      });
    }
    await media.populate([
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'productions', select: { _id: 1, name: 1 } },
      {
        path: 'tv.episodes', select: {
          _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, visibility: 1,
          _translations: 1, createdAt: 1, updatedAt: 1
        }
      },
      { path: 'addedBy', select: { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 } }
    ]);
    const translated = convertToLanguage<LeanDocument<Media>>(updateMediaDto.translate, media.toObject(), {
      populate: ['genres', 'tv.episodes'], keepTranslationsObject: authUser.hasPermission
    });
    const serializedMedia = instanceToPlain(plainToInstance(MediaDetails, translated));
    await this.auditLogService.createLogFromBuilder(auditLog);
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${translated._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: translated._id,
        media: serializedMedia
      });
    return serializedMedia;
  }

  async remove(id: string, authUser: AuthUserDto) {
    let deletedMedia: LeanDocument<Media>;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedMedia = await this.mediaModel.findByIdAndDelete(id, { session }).lean();
      if (!deletedMedia)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      const deleteCollectionPromise = deletedMedia.inCollection ?
        this.collectionService.deleteMediaCollection(id, <any>deletedMedia.inCollection, session) : null;
      await Promise.all([
        this.deleteMediaImage(deletedMedia.poster, AzureStorageContainer.POSTERS),
        this.deleteMediaImage(deletedMedia.backdrop, AzureStorageContainer.BACKDROPS),
        this.genresService.deleteMediaGenres(id, <any[]>deletedMedia.genres, session),
        this.productionsService.deleteMediaProductions(id, <any[]>deletedMedia.productions, session),
        this.tagsService.deleteMediaTags(id, <any[]>deletedMedia.tags, session),
        this.historyService.deleteMediaHistory(id, session),
        deleteCollectionPromise
      ]);
      if (deletedMedia.type === MediaType.MOVIE) {
        const deleteSubtitleLimit = pLimit(5);
        await Promise.all(deletedMedia.movie.subtitles.map(subtitle => deleteSubtitleLimit(() => this.deleteMediaSubtitle(subtitle))));
        await Promise.all([
          this.deleteMediaSource(<any>deletedMedia.movie.source, session),
          this.deleteMediaStreams(<any>deletedMedia.movie.streams, session)
        ]);
        if (deletedMedia.movie.tJobs.length)
          await this.videoCancelQueue.add('cancel', { ids: deletedMedia.movie.tJobs.toObject() }, { priority: 1 });
      } else if (deletedMedia.type === MediaType.TV) {
        const deleteEpisodeLimit = pLimit(5);
        await Promise.all(deletedMedia.tv.episodes.map(episodeId =>
          deleteEpisodeLimit(() => this.deleteEpisodeById(<any>episodeId, session))));
      }
      await this.auditLogService.createLog(authUser._id, deletedMedia._id, Media.name, AuditLogType.MEDIA_DELETE);
    });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${deletedMedia._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: deletedMedia._id
      });
  }

  async addMediaVideo(id: string, addMediaVideoDto: AddMediaVideoDto, authUser: AuthUserDto) {
    const urlMatch = addMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
    if (!urlMatch || urlMatch[1].length !== 11)
      throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube url' }, HttpStatus.BAD_REQUEST);
    const video = new MediaVideo();
    video._id = await createSnowFlakeId();
    addMediaVideoDto.name && (video.name = addMediaVideoDto.name);
    video.key = urlMatch[1];
    video.site = MediaVideoSite.YOUTUBE;
    video.official = addMediaVideoDto.official;
    const media = await this.mediaModel.findById(id).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.videos.find(v => v.key === urlMatch[1]))
      throw new HttpException({ code: StatusCode.MEDIA_VIDEO_EXIST, message: 'This video has already been added' }, HttpStatus.BAD_REQUEST);
    media.videos.push(video);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_CREATE);
    auditLog.appendChange('key', video.key);
    auditLog.appendChange('site', video.site);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const videosObject = media.videos.toObject();
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: media._id,
        videos: videosObject
      });
    return videosObject;
  }

  async findAllMediaVideos(id: string, acceptLanguage: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findById(id, { visibility: 1, videos: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (!media.videos)
      return [];
    const translated = convertToLanguageArray<MediaVideo>(acceptLanguage, media.videos, {
      keepTranslationsObject: authUser.hasPermission
    });
    return translated;
  }

  async updateMediaVideo(id: string, videoId: string, updateMediaVideoDto: UpdateMediaVideoDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, videos: { $elemMatch: { _id: videoId } } }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_UPDATE);
    const videoIndex = media.videos.findIndex(v => v._id === videoId);
    if (updateMediaVideoDto.translate && updateMediaVideoDto?.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateMediaVideoDto.translate}.name`;
      const nameKeyFromRoot = 'videos.' + videoIndex + '.' + nameKey;
      const oldName = media.get(nameKeyFromRoot);
      if (updateMediaVideoDto.name !== undefined && oldName !== updateMediaVideoDto.name) {
        auditLog.appendChange(nameKey, updateMediaVideoDto.name, oldName);
        media.set(nameKeyFromRoot, updateMediaVideoDto.name);
      }
    } else {
      const targetVideo = media.videos[videoIndex];
      if (updateMediaVideoDto.name !== undefined && targetVideo.name !== updateMediaVideoDto.name) {
        auditLog.appendChange('name', updateMediaVideoDto.name, targetVideo.name);
        targetVideo.name = updateMediaVideoDto.name;
      }
      if (updateMediaVideoDto.url) {
        const urlMatch = updateMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
        if (!urlMatch || urlMatch[1].length !== 11)
          throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube Url' }, HttpStatus.BAD_REQUEST);
        if (targetVideo.key !== urlMatch[1]) return;
        auditLog.appendChange('key', urlMatch[1], targetVideo.key);
        targetVideo.key = urlMatch[1];
      }
      if (updateMediaVideoDto.official != undefined && targetVideo.official !== updateMediaVideoDto.official) {
        auditLog.appendChange('official', updateMediaVideoDto.official, targetVideo.official);
        targetVideo.official = updateMediaVideoDto.official;
      }
    }
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const videosObject = media.videos.toObject();
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: media._id,
        videos: videosObject
      });
    return videosObject;
  }

  async deleteMediaVideo(id: string, videoId: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate(
      { _id: id, videos: { $elemMatch: { _id: videoId } } },
      { $pull: { videos: { _id: videoId } } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    await this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_DELETE);
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA_VIDEOS, {
        mediaId: media._id,
        videos: media.videos
      });
    return media.videos;
  }

  async uploadMediaPoster(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
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
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id,
        media: serializedMedia
      });
    return serializedMedia;
  }

  async deleteMediaPoster(id: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findById(id, { poster: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.poster) return;
    await this.deleteMediaImage(media.poster, AzureStorageContainer.POSTERS);
    media.poster = undefined;
    await Promise.all([
      media.save(),
      this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_POSTER_DELETE)
    ]);
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
  }

  async uploadMediaBackdrop(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const media = await this.mediaModel.findById(id, { backdrop: 1 }).exec();
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
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id,
        media: serializedMedia
      });
    return serializedMedia;
  }

  async deleteMediaBackdrop(id: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findById(id, { backdrop: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.backdrop) return;
    await this.deleteMediaImage(media.backdrop, AzureStorageContainer.BACKDROPS);
    media.backdrop = undefined;
    await Promise.all([
      media.save(),
      this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_BACKDROP_DELETE)
    ]);
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
  }

  private async deleteMediaImage(image: MediaFile, container: string) {
    if (!image) return;
    await this.azureBlobService.delete(container, `${image._id}/${image.name}`);
  }

  async uploadMovieSubtitle(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const language = await this.validateSubtitle(file);
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { 'movie.subtitles': 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.subtitles?.length) {
      const subtitle = media.movie.subtitles.find(s => s.language === language);
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
    subtitle.language = language;
    subtitle.mimeType = file.detectedMimetype;
    media.movie.subtitles.push(subtitle);
    auditLog.appendChange('name', trimmedFilename);
    auditLog.appendChange('size', subtitleFile.contentLength);
    auditLog.appendChange('language', language);
    auditLog.appendChange('mimeType', file.detectedMimetype);
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
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_SUBTITLES, {
        mediaId: media._id,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async findAllMovieSubtitles(id: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, {
      visibility: 1, 'movie.subtitles._id': 1, 'movie.subtitles.language': 1
    }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (!media.movie.subtitles)
      return [];
    return media.movie.subtitles;
  }

  async deleteMovieSubtitle(id: string, subtitleId: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { 'movie.subtitles': 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const subtitle = media.movie.subtitles.find(s => s._id === subtitleId);
    await this.deleteMediaSubtitle(subtitle);
    media.movie.subtitles.pull({ _id: subtitleId });
    await Promise.all([
      media.save(),
      this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SUBTITLE_DELETE)
    ]);
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, media.movie.subtitles.toObject()));
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_SUBTITLES, {
        mediaId: media._id,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async uploadMovieSource(id: string, addMediaSourceDto: AddMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.BAD_REQUEST);
    const { filename, size, mimeType } = addMediaSourceDto;
    const trimmedFilename = trimSlugFilename(filename);
    const driveSession = new this.driveSessionModel();
    driveSession._id = await createSnowFlakeId();
    driveSession.filename = trimmedFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>authUser._id;
    driveSession.expiry = new Date(Date.now() + 86400000);
    const uploadSession = await this.onedriveService.createUploadSession(trimmedFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  async saveMovieSource(id: string, sessionId: string, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.CONFLICT);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: <any>authUser._id })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, displayName: 1 })
      .exec();
    if (!uploadSession)
      throw new HttpException({ code: StatusCode.DRIVE_SESSION_NOT_FOUND, message: 'Upload session not found' }, HttpStatus.NOT_FOUND);
    const fileInfo = await this.onedriveService.findId(saveMediaSourceDto.fileId, uploadSession.storage);
    // Validate uploaded file
    if (fileInfo.name !== uploadSession.filename || fileInfo.size != uploadSession.size) {
      await this.onedriveService.deleteFolder(uploadSession._id, uploadSession.storage);
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'You have uploaded an invalid file' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    uploadSession.depopulate('storage');
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SOURCE_CREATE);
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
        storage: uploadSession.storage
      });
      media.movie.source = uploadSession._id;
      media.movie.status = MediaSourceStatus.PROCESSING;
      media.pStatus = MediaPStatus.PROCESSING;
      const addedJobs = await this.createTranscodeQueue(media, uploadSession.toObject(), streamSettings);
      addedJobs.forEach(j => media.movie.tJobs.push(j.id));
      auditLog.appendChange('name', uploadSession.filename);
      auditLog.appendChange('path', uploadSession._id);
      auditLog.appendChange('size', uploadSession.size);
      auditLog.appendChange('mimeType', uploadSession.mimeType);
      auditLog.appendChange('storage', <any>uploadSession.storage);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>uploadSession.storage, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.SAVE_MOVIE_SOURCE, {
        mediaId: media._id
      });
  }

  async deleteMovieSource(id: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.status === MediaSourceStatus.PENDING)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_NOT_FOUND, message: 'Media source not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.deleteMediaSource(<any>media.movie.source, session),
        this.deleteMediaStreams(<any>media.movie.streams, session)
      ]);
      if (media.movie.tJobs.length) {
        await this.videoCancelQueue.add('cancel', { ids: media.movie.tJobs.toObject() }, { priority: 1 });
        media.movie.tJobs = undefined;
      }
      media.movie.tJobs = undefined;
      media.movie.source = undefined;
      media.movie.streams = undefined;
      media.movie.status = MediaSourceStatus.PENDING;
      media.pStatus = MediaPStatus.PENDING;
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SOURCE_DELETE)
      ]);
    });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.DELETE_MOVIE_SOURCE, {
        mediaId: media._id
      });
  }

  async addMovieStream(addMediaStreamDto: AddMediaStreamDto) {
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.onedriveService.findPath(filePath, addMediaStreamDto.storage);
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.MOVIE },
      { _id: 1, movie: 1, runtime: 1, pStatus: 1 }).exec();
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
      media.movie.streams.push(addMediaStreamDto.streamId);
      media.runtime !== addMediaStreamDto.runtime && (media.runtime = addMediaStreamDto.runtime);
      media.movie.status !== MediaSourceStatus.DONE && (media.movie.status = MediaSourceStatus.READY);
      if (media.pStatus !== MediaPStatus.DONE) {
        media.pStatus = MediaPStatus.DONE;
        this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
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
    if (infoData.code !== QueueStatus.CANCELLED_ENCODING)
      updateQuery.$set = { 'movie.status': MediaSourceStatus.DONE };
    await this.mediaModel.updateOne({ _id: infoData.media }, updateQuery).exec();
    if (!infoData.isPrimary || infoData.code === QueueStatus.CANCELLED_ENCODING) return;
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${infoData.user._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_SUCCESS, {
        mediaId: infoData.media
      });
    /*
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${infoData.media}`)
    .emit(SocketMessage.REFRESH_MEDIA, {
      mediaId: infoData.media
    });
    */
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
    const media = await this.mediaModel.findById(errData.media).exec();
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (media && media.movie?.source === <any>errData._id) {
        await Promise.all([
          this.deleteMediaSource(<any>media.movie.source, session),
          this.deleteMediaStreams(<any>media.movie.streams, session)
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
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${errData.user._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_FAILURE, {
        mediaId: media._id
      });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
  }

  async findAllMovieStreams(id: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate({ _id: id, type: MediaType.MOVIE },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1 } }, { timestamps: false })
      .select({ _id: 1, movie: 1, pStatus: 1, visibility: 1 })
      .populate([
        { path: 'movie.source', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } },
        { path: 'movie.streams' }
      ])
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    if (media.pStatus !== MediaPStatus.DONE)
      throw new HttpException({ code: StatusCode.MOVIE_NOT_READY, message: 'Movie is not ready' }, HttpStatus.NOT_FOUND);
    if (!media.movie.streams?.length && isEmptyObject(media.movie.extStreams))
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    const extStreamObj = media.movie.extStreams ? await this.findExtStreamUrls(media._id, media.movie.extStreams) : undefined;
    return plainToInstance(MediaStream, {
      _id: media._id,
      storage: media.movie.source.storage,
      sourcePath: media.movie.source.path,
      streams: media.movie.streams,
      subtitles: media.movie.subtitles,
      extStreamList: extStreamObj
    });
  }

  async addMovieChapter(id: string, addMediaChapterDto: AddMediaChapterDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, media._id, Media.name, AuditLogType.MOVIE_CHAPTER_CREATE);
    const chapter = await this.addMediaChapter(media.movie.chapters, addMediaChapterDto);
    media.movie.chapters.push(chapter);
    auditLog.appendChange('name', chapter.name);
    auditLog.appendChange('start', chapter.start);
    auditLog.appendChange('end', chapter.end);
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = media.movie.chapters.toObject();
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: media._id,
        chapters: chapters
      });
    return chapters;
  }

  async findAllMovieChapters(id: string, acceptLanguage: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1, visibility: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.MEDIA_PRIVATE, message: 'This media is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguageArray<MediaChapter>(acceptLanguage, media.movie.chapters, {
      keepTranslationsObject: authUser.hasPermission
    });
    return translated;
  }

  async updateMovieChapter(id: string, chapterId: string, updateMediaChapterDto: UpdateMediaChapterDto, authUser: AuthUserDto) {
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
      const oldName = media.get(nameKeyFromRoot);
      if (updateMediaChapterDto.name != undefined && oldName !== updateMediaChapterDto.name) {
        auditLog.appendChange(nameKey, updateMediaChapterDto.name, oldName);
        media.set(nameKeyFromRoot, updateMediaChapterDto.name);
      }
    } else {
      const targetChapter = media.movie.chapters[chapterIndex];
      if (updateMediaChapterDto.name != undefined && targetChapter.name !== updateMediaChapterDto.name) {
        auditLog.appendChange('name', updateMediaChapterDto.name, targetChapter.name);
        targetChapter.name = updateMediaChapterDto.name;
      }
      if (updateMediaChapterDto.start != undefined && targetChapter.start !== updateMediaChapterDto.start) {
        auditLog.appendChange('start', updateMediaChapterDto.start, targetChapter.start);
        targetChapter.start = updateMediaChapterDto.start;
      }
      if (updateMediaChapterDto.end != undefined && targetChapter.end !== updateMediaChapterDto.end) {
        auditLog.appendChange('end', updateMediaChapterDto.end, targetChapter.end);
        targetChapter.end = updateMediaChapterDto.end;
      }
    }
    await Promise.all([
      media.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = media.movie.chapters.toObject();
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: media._id,
        chapters: chapters
      });
    return chapters;
  }

  async deleteMovieChapter(id: string, chapterId: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate({
      _id: id, type: MediaType.MOVIE
    }, { $pull: { 'movie.chapters': { _id: chapterId } } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    await this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_CHAPTER_DELETE);
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MOVIE_CHAPTERS, {
        mediaId: media._id,
        chapters: media.movie.chapters
      });
    return media.movie.chapters;
  }

  async addTVEpisode(id: string, addTVEpisodeDto: AddTVEpisodeDto, authUser: AuthUserDto) {
    const { episodeNumber, name, overview, runtime, airDate, visibility, extStreams } = addTVEpisodeDto;
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, tv: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episodeExist = await this.tvEpisodeModel.findOne({ episodeNumber, media: <any>id }).lean().exec();
    if (episodeExist)
      throw new HttpException({ code: StatusCode.EPISODE_NUMBER_EXIST, message: 'Episode number has already been used' }, HttpStatus.BAD_REQUEST);
    let episode: TVEpisodeDocument;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      episode = new this.tvEpisodeModel();
      episode._id = await createSnowFlakeId();
      episode.episodeNumber = episodeNumber;
      name && (episode.name = name);
      overview && (episode.overview = overview);
      episode.runtime = runtime;
      episode.airDate = airDate;
      episode.visibility = visibility;
      episode.media = media._id;
      episode.status = MediaSourceStatus.PENDING;
      episode.pStatus = MediaPStatus.PENDING;
      const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CREATE);
      if (extStreams && !isEmptyObject(extStreams)) {
        episode.extStreams = extStreams;
        episode.pStatus = MediaPStatus.DONE;
        media.pStatus = MediaPStatus.DONE;
        media.tv.pEpisodeCount++;
        extStreams.gogoanimeId && auditLog.appendChange('extStreams.gogoanimeId', extStreams.gogoanimeId);
        extStreams.flixHQId && auditLog.appendChange('extStreams.flixHQId', extStreams.flixHQId);
        extStreams.zoroId && auditLog.appendChange('extStreams.zoroId', extStreams.zoroId);
      }
      media.tv.episodes.push(episode._id);
      media.tv.episodeCount = media.tv.episodes.length;
      media.tv.lastAirDate = airDate;
      auditLog.appendChange('episodeNumber', episodeNumber);
      auditLog.appendChange('name', name);
      auditLog.appendChange('overview', overview);
      auditLog.appendChange('runtime', runtime);
      auditLog.appendChange('airDate.day', airDate.day);
      auditLog.appendChange('airDate.month', airDate.month);
      auditLog.appendChange('airDate.year', airDate.year);
      auditLog.appendChange('visibility', visibility);
      auditLog.appendChange('media', media._id);
      await Promise.all([
        episode.save({ session }),
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: media._id
      });
    return plainToInstance(TVEpisodeEntity, episode.toObject());
  }

  async findAllTVEpisodes(id: string, findEpisodesDto: FindTVEpisodesDto, acceptLanguage: string, authUser: AuthUserDto) {
    const population: PopulateOptions = {
      path: 'tv.episodes',
      select: {
        _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, visibility: 1,
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
    const translated = convertToLanguageArray<TVEpisode>(acceptLanguage, media.tv.episodes, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(TVEpisodeEntity, translated);
  }

  async findOneTVEpisode(id: string, episodeId: string, acceptLanguage: string, authUser: AuthUserDto) {
    const project: { [key: string]: number } = {
      _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1,
      chapters: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const match: { [key: string]: any } = { _id: episodeId, media: <any>id };
    if (authUser.hasPermission) {
      project.status = 1;
      project.subtitles = 1;
      project.chapters = 1;
      project.extStreams = 1;
    } else {
      match.pStatus = MediaPStatus.DONE
    }
    const episode = await this.tvEpisodeModel.findOne(match, project).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguage<LeanDocument<TVEpisode>>(acceptLanguage, episode, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(TVEpisodeDetails, translated);
  }

  async updateTVEpisode(id: string, episodeId: string, updateTVEpisodeDto: UpdateTVEpisodeDto, authUser: AuthUserDto) {
    if (!Object.keys(updateTVEpisodeDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: <any>id },
      {
        _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, status: 1, subtitles: 1,
        chapters: 1, visibility: 1, source: 1, extStreams: 1, _translations: 1, createdAt: 1, updatedAt: 1
      }
    ).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_UPDATE);
    if (updateTVEpisodeDto.translate && updateTVEpisodeDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateTVEpisodeDto.translate}.name`;
      const overviewKey = `_translations.${updateTVEpisodeDto.translate}.overview`;
      const oldName = episode.get(nameKey);
      const oldOverview = episode.get(overviewKey);
      if (updateTVEpisodeDto.name != undefined && oldName !== updateTVEpisodeDto.name) {
        auditLog.appendChange('name', updateTVEpisodeDto.name, oldName);
        episode.set(nameKey, updateTVEpisodeDto.name);
      }
      if (updateTVEpisodeDto.overview != undefined && oldOverview !== updateTVEpisodeDto.overview) {
        auditLog.appendChange('overview', updateTVEpisodeDto.overview, oldOverview);
        episode.set(overviewKey, updateTVEpisodeDto.overview);
      }
      await Promise.all([
        episode.save(),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    }
    else {
      const session = await this.mongooseConnection.startSession();
      await session.withTransaction(async () => {
        if (updateTVEpisodeDto.episodeNumber != undefined && updateTVEpisodeDto.episodeNumber !== episode.episodeNumber) {
          const episodeExist = await this.tvEpisodeModel.findOne({ episodeNumber: updateTVEpisodeDto.episodeNumber, media: <any>id })
            .lean().exec();
          if (episodeExist)
            throw new HttpException({ code: StatusCode.EPISODE_NUMBER_EXIST, message: 'Episode number has already been used' }, HttpStatus.BAD_REQUEST);
          auditLog.appendChange('episodeNumber', updateTVEpisodeDto.episodeNumber, episode.episodeNumber);
          episode.episodeNumber = updateTVEpisodeDto.episodeNumber;
        }
        if (updateTVEpisodeDto.name !== undefined && episode.name !== updateTVEpisodeDto.name) {
          auditLog.appendChange('name', updateTVEpisodeDto.name, episode.name);
          episode.name = updateTVEpisodeDto.name;
        }
        if (updateTVEpisodeDto.overview !== undefined && episode.overview !== updateTVEpisodeDto.overview) {
          auditLog.appendChange('overview', updateTVEpisodeDto.overview, episode.overview);
          episode.overview = updateTVEpisodeDto.overview;
        }
        if (updateTVEpisodeDto.runtime != undefined && episode.runtime !== updateTVEpisodeDto.runtime) {
          auditLog.appendChange('runtime', updateTVEpisodeDto.runtime, episode.runtime);
          episode.runtime = updateTVEpisodeDto.runtime;
        }
        if (updateTVEpisodeDto.airDate != undefined && !isEqualShallow(episode.airDate, updateTVEpisodeDto.airDate)) {
          auditLog.appendChange('airDate.day', updateTVEpisodeDto.airDate.day, episode.airDate.day);
          auditLog.appendChange('airDate.month', updateTVEpisodeDto.airDate.month, episode.airDate.month);
          auditLog.appendChange('airDate.year', updateTVEpisodeDto.airDate.year, episode.airDate.year);
          episode.airDate = updateTVEpisodeDto.airDate;
        }
        if (updateTVEpisodeDto.visibility !== undefined && episode.visibility !== updateTVEpisodeDto.visibility) {
          auditLog.appendChange('visibility', updateTVEpisodeDto.visibility, episode.visibility);
          episode.visibility = updateTVEpisodeDto.visibility;
        }
        if (updateTVEpisodeDto.extStreams) {
          if (updateTVEpisodeDto.extStreams.gogoanimeId && updateTVEpisodeDto.extStreams.gogoanimeId !== episode.extStreams.gogoanimeId) {
            auditLog.appendChange('extStreams.gogoanimeId', updateTVEpisodeDto.extStreams.gogoanimeId, episode.extStreams.gogoanimeId);
            episode.set('extStreams.gogoanimeId', updateTVEpisodeDto.extStreams.gogoanimeId);
          }
          if (updateTVEpisodeDto.extStreams.flixHQId != undefined && updateTVEpisodeDto.extStreams.flixHQId !== episode.extStreams.flixHQId) {
            auditLog.appendChange('extStreams.flixHQId', updateTVEpisodeDto.extStreams.flixHQId, episode.extStreams.flixHQId);
            episode.set('extStreams.flixHQId', updateTVEpisodeDto.extStreams.flixHQId);
          }
          if (updateTVEpisodeDto.extStreams.zoroId != undefined && updateTVEpisodeDto.extStreams.zoroId !== episode.extStreams.zoroId) {
            auditLog.appendChange('extStreams.zoroId', updateTVEpisodeDto.extStreams.zoroId, episode.extStreams.zoroId);
            episode.set('extStreams.zoroId', updateTVEpisodeDto.extStreams.zoroId);
          }
          // Calculate pStatus and public episode count
          let newPStatus: MediaPStatus;
          if (episode.status === MediaSourceStatus.PENDING) {
            if (isEmptyObject(episode.toObject().extStreams))
              newPStatus = MediaPStatus.PENDING;
            else
              newPStatus = MediaPStatus.DONE;
          } else {
            if (episode.status === MediaSourceStatus.DONE || episode.status === MediaSourceStatus.READY)
              newPStatus = MediaPStatus.DONE;
            else
              newPStatus = MediaPStatus.PROCESSING;
          }
          if (newPStatus != episode.pStatus) {
            episode.pStatus = newPStatus;
            await this.updatePublicEpisodeCount(id);
          }
          // Clear external stream urls cache
          await this.clearExtStreamUrlsCache(`${id}#${episode._id}`);
        }
        await Promise.all([
          episode.save({ session }),
          this.auditLogService.createLogFromBuilder(auditLog)
        ]);
      });
    }
    const serializedEpisode = instanceToPlain(plainToInstance(TVEpisodeEntity, episode.toObject()));
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`).to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episode._id,
        episode: serializedEpisode
      });
    return serializedEpisode;
  }

  async deleteTVEpisode(id: string, episodeId: string, authUser: AuthUserDto) {
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
      if (episode.pStatus === MediaPStatus.DONE)
        media.tv.pEpisodeCount--;
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_DELETE)
      ]);
    });
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`).to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episodeId
      });
  }

  private async deleteEpisodeById(episodeId: string, session: ClientSession) {
    const episode = await this.tvEpisodeModel.findOneAndDelete({ _id: episodeId }, { session }).lean();
    if (!episode) return;
    await this.deleteMediaImage(episode.still, AzureStorageContainer.STILLS);
    const deleteSubtitleLimit = pLimit(5);
    await Promise.all(episode.subtitles.map(subtitle => deleteSubtitleLimit(() => this.deleteMediaSubtitle(subtitle))));
    await Promise.all([
      this.deleteMediaSource(<any>episode.source, session),
      this.deleteMediaStreams(<any>episode.streams, session),
      this.historyService.deleteTVEpisodeHistory(episodeId, session)
    ]);
    if (episode.tJobs.length)
      await this.videoCancelQueue.add('cancel', { ids: episode.tJobs }, { priority: 1 });
    return episode;
  }

  async uploadTVEpisodeStill(id: string, episodeId: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: <any>id },
      { episodeNumber: 1, name: 1, overview: 1, runtime: 1, still: 1, airDate: 1, visibility: 1 }
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
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`).to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episodeId,
        episode: serializedEpisode
      });
    return serializedEpisode;
  }

  async deleteTVEpisodeStill(id: string, episodeId: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { still: 1 }).exec();
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
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`).to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_EPISODE, {
        mediaId: id,
        episodeId: episodeId
      });
  }

  async uploadTVEpisodeSubtitle(id: string, episodeId: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const language = await this.validateSubtitle(file);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.subtitles?.length) {
      const subtitle = episode.subtitles.find(s => s.language === language);
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
      subtitle.language = language;
      subtitle.mimeType = file.detectedMimetype;
      episode.subtitles.push(subtitle);
      auditLog.appendChange('name', trimmedFilename);
      auditLog.appendChange('size', subtitleFile.contentLength);
      auditLog.appendChange('language', language);
      auditLog.appendChange('mimeType', file.detectedMimetype);
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
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_SUBTITLES, {
        mediaId: id,
        episodeId: episodeId,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async findAllTVEpisodeSubtitles(id: string, episodeId: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, {
      visibility: 1,
      'subtitles._id': 1,
      'subtitles.language': 1
    }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    if (!episode.subtitles)
      return [];
    return episode.subtitles;
  }

  async deleteTVEpisodeSubtitle(id: string, episodeId: string, subtitleId: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const subtitle = episode.subtitles.find(s => s._id === subtitleId);
      await this.deleteMediaSubtitle(subtitle);
      episode.subtitles.pull({ _id: subtitleId });
      await Promise.all([
        episode.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SUBTITLE_DELETE)
      ]);
    });
    const serializedSubtitles = instanceToPlain(plainToInstance(MediaSubtitle, episode.subtitles.toObject()));
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_SUBTITLES, {
        mediaId: id,
        episodeId: episodeId,
        subtitles: serializedSubtitles
      });
    return serializedSubtitles;
  }

  async uploadTVEpisodeSource(id: string, episodeId: string, addMediaSourceDto: AddMediaSourceDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { source: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.BAD_REQUEST);
    // TODO: Combine with uploadMovieSource
    const { filename, size, mimeType } = addMediaSourceDto;
    const trimmedFilename = trimSlugFilename(filename);
    const driveSession = new this.driveSessionModel();
    driveSession._id = await createSnowFlakeId();
    driveSession.filename = trimmedFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>authUser._id;
    driveSession.expiry = new Date(Date.now() + 86400000);
    const uploadSession = await this.onedriveService.createUploadSession(trimmedFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  async saveTVEpisodeSource(id: string, episodeId: string, sessionId: string, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, pStatus: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { _id: 1, source: 1, status: 1, tJobs: 1 })
      .exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.CONFLICT);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: <any>authUser._id })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, displayName: 1 })
      .exec();
    if (!uploadSession)
      throw new HttpException({ code: StatusCode.DRIVE_SESSION_NOT_FOUND, message: 'Upload session not found' }, HttpStatus.NOT_FOUND);
    const fileInfo = await this.onedriveService.findId(saveMediaSourceDto.fileId, uploadSession.storage);
    // Validate uploaded file
    if (fileInfo.name !== uploadSession.filename || fileInfo.size != uploadSession.size) {
      await this.onedriveService.deleteFolder(uploadSession._id, uploadSession.storage);
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'You have uploaded an invalid file' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    uploadSession.depopulate('storage');
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SOURCE_CREATE);
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
        episode: episode.episodeNumber,
        storage: uploadSession.storage
      });
      episode.source = uploadSession._id;
      episode.status = MediaSourceStatus.PROCESSING;
      episode.pStatus = MediaPStatus.PROCESSING;
      media.pStatus !== MediaPStatus.DONE && (media.pStatus = MediaPStatus.PROCESSING);
      const addedJobs = await this.createTranscodeQueue(media, uploadSession.toObject(), streamSettings, episode);
      addedJobs.forEach(j => episode.tJobs.push(j.id));
      auditLog.appendChange('name', uploadSession.filename);
      auditLog.appendChange('path', uploadSession._id);
      auditLog.appendChange('size', uploadSession.size);
      auditLog.appendChange('mimeType', uploadSession.mimeType);
      auditLog.appendChange('storage', <any>uploadSession.storage);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>uploadSession.storage, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        episode.save({ session }),
        media.save({ session }),
        this.auditLogService.createLogFromBuilder(auditLog)
      ]);
    });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`)
      .to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .emit(SocketMessage.SAVE_TV_SOURCE, {
        mediaId: media._id,
        episodeId: episode._id
      });
  }

  async deleteTVEpisodeSource(id: string, episodeId: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { _id: 1, source: 1, streams: 1, status: 1, tJobs: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.deleteMediaSource(<any>episode.source, session),
        this.deleteMediaStreams(<any>episode.streams, session)
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
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${id}`)
      .to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episodeId}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.DELETE_TV_SOURCE, {
        mediaId: id,
        episodeId: episodeId
      });
  }

  async addTVEpisodeStream(addMediaStreamDto: AddMediaStreamDto) {
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.onedriveService.findPath(filePath, addMediaStreamDto.storage);
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.TV },
      { _id: 1, tv: 1, runtime: 1, pStatus: 1 }).exec();
    const episode = await this.tvEpisodeModel.findOne({ _id: addMediaStreamDto.episode, media: <any>addMediaStreamDto.media },
      { _id: 1, runtime: 1, streams: 1, status: 1 }).exec();
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
      episode.streams.push(addMediaStreamDto.streamId);
      episode.runtime !== addMediaStreamDto.runtime && (episode.runtime = addMediaStreamDto.runtime);
      episode.status !== MediaSourceStatus.DONE && (episode.status = MediaSourceStatus.READY);
      if (episode.pStatus !== MediaPStatus.DONE) {
        episode.pStatus = MediaPStatus.DONE;
        await this.updatePublicEpisodeCount(addMediaStreamDto.media);
      }
      !media.runtime && (media.runtime = addMediaStreamDto.runtime);
      if (media.pStatus !== MediaPStatus.DONE) {
        media.pStatus = MediaPStatus.DONE;
        this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${media._id}`)
          .to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
          .emit(SocketMessage.ADD_TV_STREAM, {
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
    if (infoData.code !== QueueStatus.CANCELLED_ENCODING)
      updateQuery.$set = { status: MediaSourceStatus.DONE };
    const episode = await this.tvEpisodeModel.findOneAndUpdate({ _id: infoData.episode, media: infoData.media }, updateQuery)
      .lean().exec();
    if (!infoData.isPrimary || infoData.code === QueueStatus.CANCELLED_ENCODING) return;
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${infoData.user._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_SUCCESS, {
        mediaId: infoData.media,
        episodeNumber: episode.episodeNumber
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
      button_url: `${this.configService.get('WEBSITE_URL')}/watch/${infoData.media}?episode=${episode.episodeNumber}`
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
          this.deleteMediaSource(<any>episode.source, session),
          this.deleteMediaStreams(<any>episode.streams, session)
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
    this.wsAdminGateway.server.to(`${SocketRoom.USER_ID}:${errData.user._id}`)
      .emit(SocketMessage.MEDIA_PROCESSING_FAILURE, {
        mediaId: errData.media,
        episodeNumber: episode.episodeNumber
      });
    this.wsAdminGateway.server.to(SocketRoom.ADMIN_MEDIA_LIST).to(`${SocketRoom.ADMIN_MEDIA_DETAILS}:${errData.media}`)
      .to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .emit(SocketMessage.REFRESH_MEDIA, {
        mediaId: errData.media
      });
  }

  async findAllTVEpisodeStreams(id: string, episodeNumber: number, authUser: AuthUserDto) {
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
      { media: id, episodeNumber: episodeNumber },
      { $inc: { views: 1 } }
    ).populate([
      { path: 'source', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } },
      { path: 'streams' }
    ]).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    if (!episode.streams?.length && isEmptyObject(episode.extStreams))
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    const extStreamObj = episode.extStreams ?
      await this.findExtStreamUrls(`${media._id}#${episode._id}`, episode.extStreams) :
      undefined;
    return plainToInstance(MediaStream, {
      _id: media._id,
      episode: episode,
      storage: episode.source.storage,
      sourcePath: episode.source.path,
      streams: episode.streams,
      subtitles: episode.subtitles,
      extStreamList: extStreamObj
    });
  }

  async addTVEpisodeChapter(id: string, episodeId: string, addMediaChapterDto: AddMediaChapterDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CHAPTER_CREATE);
    const chapter = await this.addMediaChapter(episode.chapters, addMediaChapterDto);
    episode.chapters.push(chapter);
    auditLog.appendChange('name', chapter.name);
    auditLog.appendChange('start', chapter.start);
    auditLog.appendChange('end', chapter.end);
    await Promise.all([
      episode.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = episode.chapters.toObject();
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: episode.media,
        episodeId: episode._id,
        chapters: chapters
      });
    return chapters;
  }

  async findAllTVEpisodeChapters(id: string, episodeId: string, acceptLanguage: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.visibility === MediaVisibility.PRIVATE && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.EPISODE_PRIVATE, message: 'This episode is private' }, HttpStatus.FORBIDDEN);
    const translated = convertToLanguageArray<MediaChapter>(acceptLanguage, episode.chapters);
    return translated;
  }

  async updateTVEpisodeChapter(id: string, episodeId: string, chapterId: string, updateMediaChapterDto: UpdateMediaChapterDto, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const chapterIndex = episode.chapters.findIndex(c => c._id === chapterId);
    if (chapterIndex === -1)
      throw new HttpException({ code: StatusCode.CHAPTER_NOT_FOUND, message: 'Chapter not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CHAPTER_UPDATE);
    if (updateMediaChapterDto.translate && updateMediaChapterDto.translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${updateMediaChapterDto.translate}.name`;
      const nameKeyFromRoot = 'chapters.' + chapterIndex + '.' + nameKey;
      const oldName = episode.get(nameKeyFromRoot);
      if (updateMediaChapterDto.name != undefined && oldName !== updateMediaChapterDto.name) {
        auditLog.appendChange(nameKey, updateMediaChapterDto.name, oldName);
        episode.set(nameKeyFromRoot, updateMediaChapterDto.name);
      }
    } else {
      const targetChapter = episode.chapters[chapterIndex];
      if (updateMediaChapterDto.name != undefined && targetChapter.name !== updateMediaChapterDto.name) {
        auditLog.appendChange('name', updateMediaChapterDto.name, targetChapter.name);
        targetChapter.name = updateMediaChapterDto.name;
      }
      if (updateMediaChapterDto.start != undefined && targetChapter.start !== updateMediaChapterDto.start) {
        auditLog.appendChange('start', updateMediaChapterDto.start, targetChapter.start);
        targetChapter.start = updateMediaChapterDto.start;
      }
      if (updateMediaChapterDto.end != undefined && targetChapter.end !== updateMediaChapterDto.end) {
        auditLog.appendChange('end', updateMediaChapterDto.end, targetChapter.end);
        targetChapter.end = updateMediaChapterDto.end;
      }
    }
    await Promise.all([
      episode.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const chapters = episode.chapters.toObject();
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: episode.media,
        episodeId: episode._id,
        chapters: chapters
      });
    return chapters;
  }

  async deleteTVEpisodeChapter(id: string, episodeId: string, chapterId: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOneAndUpdate({
      _id: episodeId, media: <any>id
    }, { $pull: { chapters: { _id: chapterId } } }, { new: true }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    await this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CHAPTER_DELETE);
    this.wsAdminGateway.server.to(`${SocketRoom.ADMIN_EPISODE_DETAILS}:${episode._id}`)
      .except(`${SocketRoom.USER_ID}:${authUser._id}`)
      .emit(SocketMessage.REFRESH_TV_CHAPTERS, {
        mediaId: episode.media,
        episodeId: episode._id,
        chapters: episode.chapters
      });
    return episode.chapters;
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

  async updateMediaRating(id: string, incCount: number, incScore: number, session?: ClientSession) {
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

  findOneById(id: string, fields?: { [key: string]: any }) {
    return this.mediaModel.findById(id, fields).lean().exec();
  }

  findOneTVEpisodeById(id: string, episodeId: string, fields?: { [key: string]: any }) {
    return this.tvEpisodeModel.findOne({ _id: episodeId, media: id }, fields).lean().exec();
  }

  findOneTVEpisodeByNumber(id: string, episodeNumber: number, fields?: { [key: string]: any }) {
    return this.tvEpisodeModel.findOne({ media: id, episodeNumber: episodeNumber }, fields).lean().exec();
  }

  findAvailableMedia(id: string, session?: ClientSession) {
    return this.mediaModel.findOne({ _id: id, pStatus: MediaPStatus.DONE }, {}, { session }).lean();
  }

  async findOneForPlaylist(id: string) {
    return this.mediaModel.findById(id, {
      _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
      poster: 1, backdrop: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
      createdAt: 1, updatedAt: 1
    }).lean().exec();
  }

  private async updatePublicEpisodeCount(id: string) {
    const [publicEpisodes] = await this.mediaModel.aggregate([
      { $match: { _id: id } },
      { $lookup: { from: 'tvepisodes', localField: 'tv.episodes', foreignField: '_id', as: 'tv.episodes' } },
      { $match: { 'tv.episodes.pStatus': MediaPStatus.DONE } },
      { $project: { count: { $size: '$tv.episodes' } } }
    ]).exec();
    const newCount = publicEpisodes ? publicEpisodes.count : 0;
    return this.mediaModel.updateOne({ _id: id }, { 'tv.pEpisodeCount': newCount }).exec();
  }

  // Create new genres and productions start with "create:" keyword, check existing ones by ids
  private async findOrCreateGenres(genres: string[], session: ClientSession) {
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
        existingGenreIds.push(genres[i]);
      }
    }
    const genreCount = await this.genresService.countByIds(existingGenreIds);
    if (genreCount !== existingGenreIds.length)
      throw new HttpException({ code: StatusCode.GENRES_NOT_FOUND, message: 'Cannot find all the required genres' }, HttpStatus.BAD_REQUEST);
    if (newGenres.length) {
      const createdGenres = await this.genresService.createMany(newGenres, session);
      const createdGenreIds = createdGenres.map(g => g._id);
      existingGenreIds.push(...createdGenreIds);
    }
    return existingGenreIds;
  }

  private async findOrCreateProductions(productions: string[], session: ClientSession) {
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
        existingProductionIds.push(productions[i]);
      }
    }
    if (existingProductionIds.length) {
      const productionCount = await this.productionsService.countByIds(existingProductionIds);
      if (productionCount !== existingProductionIds.length)
        throw new HttpException({ code: StatusCode.PRODUCTIONS_NOT_FOUND, message: 'Cannot find all the required productions' }, HttpStatus.BAD_REQUEST);
    }
    if (newProductions.length) {
      const createdProductions = await this.productionsService.createMany(newProductions, session);
      const createdProductionIds = createdProductions.map(g => g._id);
      existingProductionIds.push(...createdProductionIds);
    }
    return existingProductionIds;
  }

  private async findOrCreateTags(tags: string[], session: ClientSession) {
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
        existingTagIds.push(tags[i]);
      }
    }
    const tagCount = await this.tagsService.countByIds(existingTagIds);
    if (tagCount !== existingTagIds.length)
      throw new HttpException({ code: StatusCode.TAGS_NOT_FOUND, message: 'Cannot find all the required tags' }, HttpStatus.BAD_REQUEST);
    if (newTags.length) {
      const createdTags = await this.tagsService.createMany(newTags, session);
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
    if (!file.filename.endsWith('.vtt'))
      throw new HttpException({ code: StatusCode.INVALID_SUBTITLE, message: 'Subtitle is invalid' }, HttpStatus.BAD_REQUEST);
    const firstLine = await readFirstLine(file.filepath);
    if (!firstLine.includes('WEBVTT'))
      throw new HttpException({ code: StatusCode.INVALID_SUBTITLE, message: 'Subtitle is invalid' }, HttpStatus.BAD_REQUEST);
    return language;
  }

  private async deleteMediaSubtitle(subtitle: MediaFile) {
    if (!subtitle) return;
    await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, `${subtitle._id}/${subtitle.name}`);
  }

  private createTranscodeQueue(media: Media, uploadSession: DriveSession, streamSettings: Setting, episode?: TVEpisode) {
    // Create transcode queue
    const jobs = [];
    for (let i = 0; i < STREAM_CODECS.length; i++) {
      if (streamSettings.defaultStreamCodecs & STREAM_CODECS[i]) {
        jobs.push({
          name: STREAM_CODECS[i].toString(),
          data: {
            ...uploadSession,
            media: media._id,
            episode: episode?._id,
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

  private async findExtStreamUrls(cacheId: string, extStreams: MediaExternalStreams) {
    const cacheKey = `${CachePrefix.MEDIA_EXTERNAL_STREAMS}:${cacheId}`;
    return this.redis2ndCacheService.wrap(cacheKey, async () => {
      const extStreamPromises = [];
      extStreams.gogoanimeId && extStreamPromises.push(this.externalStreamService.fetchGogoStreamUrl(extStreams.gogoanimeId));
      extStreams.flixHQId && extStreamPromises.push(this.externalStreamService.fetchFlixHQStream(extStreams.flixHQId));
      extStreams.zoroId && extStreamPromises.push(this.externalStreamService.fetchZoroStream(extStreams.zoroId));
      const [gogoAnimeStreamUrl, flixHQStream, zoroStream] = await Promise.all(extStreamPromises);
      return { gogoAnimeStreamUrl, flixHQStream, zoroStream };
    }, { ttl: 1800 });
  }

  private clearExtStreamUrlsCache(cacheId: string) {
    const cacheKey = `${CachePrefix.MEDIA_EXTERNAL_STREAMS}:${cacheId}`;
    return this.redis2ndCacheService.del(cacheKey);
  }

  private async deleteMediaSource(id: string, session?: ClientSession) {
    if (!id)
      return;
    const source = await this.mediaStorageModel.findByIdAndDelete(id, { session }).populate('storage').lean();
    if (source) {
      await this.externalStoragesService.deleteFileFromStorage(source.storage._id, id, source.size, session);
      this.onedriveService.deleteFolder(id, source.storage, 5)
    }
  }

  private async deleteMediaStreams(ids: string[], session?: ClientSession) {
    if (!Array.isArray(ids))
      return;
    for (let i = 0; i < ids.length; i++) {
      const source = await this.mediaStorageModel.findByIdAndDelete(ids[i], { session }).lean();
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

  deleteGenreMedia(genreId: string, mediaIds: string[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { genres: genreId } }, { session });
  }

  deleteProductionMedia(productionId: string, mediaIds: string[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { productions: productionId } }, { session });
  }

  deleteCollectionMedia(mediaIds: string[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { inCollection: null }, { session });
  }

  deleteTagMedia(tagId: string, mediaIds: string[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { tags: tagId } }, { session });
  }
}
