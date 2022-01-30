import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, LeanDocument, Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { plainToInstance, plainToClassFromExist } from 'class-transformer';
import ISO6391 from 'iso-639-1';
import slugify from 'slugify';

import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { AddMediaVideoDto } from './dto/add-media-video.dto';
import { PaginateMediaDto } from './dto/paginate-media.dto';
import { AddMediaSourceDto } from './dto/add-media-source.dto';
import { AddMediaStreamDto } from './dto/add-media-stream.dto';
import { MediaQueueStatusDto } from './dto/media-queue-status.dto';
import { SaveMediaSourceDto } from './dto/save-media-source.dto';
import { AddTVEpisodeDto } from './dto/add-tv-episode.dto';
import { UpdateTVEpisodeDto } from './dto/update-tv-episode.dto';
import { Media, MediaDocument } from '../../schemas/media.schema';
import { MediaStorage, MediaStorageDocument } from '../../schemas/media-storage.schema';
import { MediaFile } from '../../schemas/media-file.schema';
import { DriveSession, DriveSessionDocument } from '../../schemas/drive-session.schema';
import { Movie } from '../../schemas/movie.schema';
import { TVShow } from '../../schemas/tv-show.schema';
import { TVEpisode, TVEpisodeDocument } from '../../schemas/tv-episode.schema';
import { MediaVideo } from '../../schemas/media-video.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GenresService } from '../genres/genres.service';
import { ProducersService } from '../producers/producers.service';
import { SettingsService } from '../settings/settings.service';
import { AzureBlobService } from '../../common/azure-blob/azure-blob.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { HttpEmailService } from '../../common/http-email/http-email.service';
import { Paginated } from '../roles/entities/paginated.entity';
import { Media as MediaEntity } from './entities/media.entity';
import { MediaDetails } from './entities/media-details.entity';
import { MediaSubtitle } from './entities/media-subtitle.entity';
import { MediaStream } from './entities/media-stream.entity';
import { TVEpisode as TVEpisodeEntity } from './entities/tv-episode.entity';
import {
  LookupOptions, MongooseAggregation, convertToLanguage, convertToLanguageArray,
  createSnowFlakeIdAsync, readFirstLine, trimSlugFilename
} from '../../utils';
import {
  MediaType, MediaVideoSite, StatusCode, MongooseConnection, TaskQueue, MediaStorageType, MediaStatus, MediaSourceStatus,
  SendgridTemplate, AzureStorageContainer, AuditLogType, MediaFileType, StreamCodec, MediaVisibility
} from '../../enums';
import { I18N_DEFAULT_LANGUAGE, STREAM_CODECS } from '../../config';


@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name) private mediaModel: Model<MediaDocument>, @InjectModel(MediaStorage.name) private mediaStorageModel: Model<MediaStorageDocument>,
    @InjectModel(DriveSession.name) private driveSessionModel: Model<DriveSessionDocument>, @InjectModel(TVEpisode.name) private tvEpisodeModel: Model<TVEpisodeDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection, @InjectQueue(TaskQueue.VIDEO_TRANSCODE) private videoTranscodeQueue: Queue,
    @Inject(forwardRef(() => GenresService)) private genresService: GenresService, @Inject(forwardRef(() => ProducersService)) private producersService: ProducersService,
    private auditLogService: AuditLogService, private externalStoragesService: ExternalStoragesService, private settingsService: SettingsService,
    private httpEmailService: HttpEmailService, private googleDriveService: GoogleDriveService, private azureBlobService: AzureBlobService,
    private configService: ConfigService) { }

  async create(createMediaDto: CreateMediaDto, authUser: AuthUserDto) {
    const { type, title, originalTitle, overview, originalLanguage, runtime, adult, releaseDate, lastAirDate, status, visibility } = createMediaDto;
    const slug = (originalTitle?.toLowerCase() === title.toLowerCase()) ?
      slugify(title, { lower: true }) :
      slugify(`${title} ${originalTitle}`, { lower: true });
    const media = new this.mediaModel({
      type, title, originalTitle, slug, overview, originalLanguage, runtime, adult,
      releaseDate, status, visibility, pStatus: MediaStatus.PROCESSING, addedBy: authUser._id
    });
    media._id = await createSnowFlakeIdAsync();
    if (createMediaDto.type === MediaType.MOVIE) {
      media.movie = new Movie();
      media.movie.status = MediaSourceStatus.PENDING;
    }
    else if (createMediaDto.type === MediaType.TV) {
      media.tv = new TVShow();
      media.tv.lastAirDate = lastAirDate;
    }
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (createMediaDto.genres?.length) {
        const genreCount = await this.genresService.countByIds(createMediaDto.genres);
        if (genreCount !== createMediaDto.genres.length)
          throw new HttpException({ code: StatusCode.GENRES_NOT_FOUND, message: 'Cannot find all the required genres' }, HttpStatus.NOT_FOUND);
        media.genres = <any>createMediaDto.genres;
        await this.genresService.addMediaGenres(media._id, createMediaDto.genres, session);
      }
      if (createMediaDto.producers?.length) {
        const producerCount = await this.producersService.countByIds(createMediaDto.producers);
        if (producerCount !== createMediaDto.producers.length)
          throw new HttpException({ code: StatusCode.PRODUCERS_NOT_FOUND, message: 'Cannot find all the required producers' }, HttpStatus.NOT_FOUND);
        media.producers = <any>createMediaDto.producers;
        await this.producersService.addMediaProducers(media._id, createMediaDto.producers, session);
      }
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_CREATE)
      ]);
    });
    return plainToInstance(MediaDetails, media.toObject());
  }

  async findAll(paginateMediaDto: PaginateMediaDto, acceptLanguage: string, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'title', 'originalLanguage', 'releaseDate.year', 'views', 'dailyViews', 'weeklyViews', 'ratingAverage',
      'createdAt', 'updatedAt'];
    const fields = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, runtime: 1, 'tv.episodeCount': 1, poster: 1, backdrop: 1,
      genres: 1, originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, dailyViews: 1, weeklyViews: 1, ratingCount: 1,
      ratingAverage: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const { adult, page, limit, sort, search, type, originalLanguage, year, genres, includeHidden, includeUnprocessed } = paginateMediaDto;
    const filters: any = {};
    type !== undefined && (filters.type = type);
    originalLanguage !== undefined && (filters.originalLanguage = originalLanguage);
    year !== undefined && (filters['releaseDate.year'] = year);
    adult !== undefined && (filters.adult = adult);
    if (Array.isArray(genres))
      filters.genres = { $in: genres };
    else if (genres !== undefined)
      filters.genres = genres;
    (!authUser.hasPermission || !includeHidden) && (filters.visibility = MediaVisibility.PUBLIC);
    (!authUser.hasPermission || !includeUnprocessed) && (filters.pStatus = MediaStatus.DONE);
    const aggregation = new MongooseAggregation({ page, limit, fields, sortQuery: sort, search, sortEnum, fullTextSearch: true });
    Object.keys(filters).length && (aggregation.filters = filters);
    const lookups: LookupOptions[] = [{
      from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
      project: { _id: 1, name: 1, _translations: 1 }
    }];
    const pipeline = aggregation.buildLookup(lookups);
    const [data] = await this.mediaModel.aggregate(pipeline).exec();
    let mediaList = new Paginated<MediaEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<MediaEntity>(acceptLanguage, data.results, { populate: ['genres'] });
      mediaList = plainToClassFromExist(new Paginated<MediaEntity>({ type: MediaEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return mediaList;
  }

  async findOne(id: string, acceptLanguage: string, authUser: AuthUserDto) {
    const project: any = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
      producers: 1, credits: 1, runtime: 1, movie: 1, tv: 1, videos: 1, adult: 1, releaseDate: 1, status: 1,
      views: 1, dailyViews: 1, weeklyViews: 1, ratingCount: 1, ratingAverage: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const lookups: any[] = [
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'producers', select: { _id: 1, name: 1 } },
      { path: 'tv.episodes' }
    ];
    if (authUser.hasPermission) {
      project.pStatus = 1;
      project.addedBy = 1;
      lookups.push({
        path: 'addedBy',
        select: { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 }
      });
    }
    const media = await this.mediaModel.findById(id, project).populate(lookups).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<Media>>(acceptLanguage, media, { populate: ['genres', 'tv.episodes'] });
    return plainToInstance(MediaDetails, translated);
  }

  async update(id: string, updateMediaDto: UpdateMediaDto, authUser: AuthUserDto) {
    if (!Object.keys(updateMediaDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const media = await this.mediaModel.findById(id).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (updateMediaDto.translate && updateMediaDto.translate !== I18N_DEFAULT_LANGUAGE) {
      updateMediaDto.title != undefined && media.set(`_translations.${updateMediaDto.translate}.title`, updateMediaDto.title);
      updateMediaDto.overview != undefined && media.set(`_translations.${updateMediaDto.translate}.overview`, updateMediaDto.overview);
      const slug = slugify(updateMediaDto.title, { lower: true });
      media.set(`_translations.${updateMediaDto.translate}.slug`, slug || null);
      await media.save();
    }
    else {
      const session = await this.mongooseConnection.startSession();
      await session.withTransaction(async () => {
        updateMediaDto.title != undefined && (media.title = updateMediaDto.title);
        updateMediaDto.originalTitle !== undefined && (media.originalTitle = updateMediaDto.originalTitle);
        updateMediaDto.overview != undefined && (media.overview = updateMediaDto.overview);
        updateMediaDto.originalLanguage !== undefined && (media.originalLanguage = updateMediaDto.originalLanguage);
        updateMediaDto.runtime != undefined && (media.runtime = updateMediaDto.runtime);
        updateMediaDto.adult != undefined && (media.adult = updateMediaDto.adult);
        updateMediaDto.releaseDate != undefined && (media.releaseDate = updateMediaDto.releaseDate);
        updateMediaDto.lastAirDate !== undefined && media.type === MediaType.TV && (media.tv.lastAirDate = updateMediaDto.lastAirDate);
        if (updateMediaDto.title != undefined || updateMediaDto.originalTitle !== undefined) {
          const slug = (media.originalTitle?.toLowerCase() === media.title.toLowerCase()) ?
            slugify(media.title, { lower: true }) :
            slugify(`${media.title} ${media.originalTitle}`, { lower: true });
          media.slug = slug;
        }
        if (Array.isArray(updateMediaDto.genres)) {
          const genreCount = await this.genresService.countByIds(updateMediaDto.genres);
          if (genreCount !== updateMediaDto.genres.length)
            throw new HttpException({ code: StatusCode.GENRES_NOT_FOUND, message: 'Cannot find all the required genres' }, HttpStatus.NOT_FOUND);
          const mediaGenres: any[] = media.genres;
          const newGenres = updateMediaDto.genres.filter(e => !mediaGenres.includes(e));
          const oldGenres = mediaGenres.filter(e => !updateMediaDto.genres.includes(e));
          media.genres = <any>updateMediaDto.genres;
          await Promise.all([
            this.genresService.addMediaGenres(media._id, newGenres, session),
            this.genresService.deleteMediaGenres(media._id, oldGenres, session)
          ]);
        }
        if (Array.isArray(updateMediaDto.producers)) {
          const producerCount = await this.producersService.countByIds(updateMediaDto.producers);
          if (producerCount !== updateMediaDto.producers.length)
            throw new HttpException({ code: StatusCode.PRODUCERS_NOT_FOUND, message: 'Cannot find all the required producers' }, HttpStatus.NOT_FOUND);
          const mediaProducers: any[] = media.producers;
          const newProducers = updateMediaDto.producers.filter(e => !mediaProducers.includes(e));
          const oldProducers = mediaProducers.filter(e => !updateMediaDto.producers.includes(e));
          media.producers = <any>updateMediaDto.producers;
          await Promise.all([
            this.producersService.addMediaProducers(media._id, newProducers, session),
            this.producersService.deleteMediaProducers(media._id, oldProducers, session)
          ]);
        }
        await media.save({ session });
      });
    }
    await media.populate([
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'producers', select: { _id: 1, name: 1 } },
      { path: 'addedBy', select: { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 } }
    ]);
    const translated = convertToLanguage<LeanDocument<Media>>(updateMediaDto.translate, media.toObject(), { populate: ['genres'] });
    await this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_UPDATE);
    return plainToInstance(MediaDetails, translated);
  }

  async remove(id: string, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedMedia = await this.mediaModel.findByIdAndDelete(id, { session }).lean();
      if (!deletedMedia)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.deleteMediaImage(deletedMedia.poster, AzureStorageContainer.POSTERS),
        this.deleteMediaImage(deletedMedia.backdrop, AzureStorageContainer.BACKDROPS),
        this.genresService.deleteMediaGenres(id, <any[]>deletedMedia.genres, session),
        this.producersService.deleteMediaProducers(id, <any[]>deletedMedia.producers, session)
      ]);
      if (deletedMedia.type === MediaType.MOVIE) {
        await Promise.all(deletedMedia.movie.subtitles.map(subtitle => this.deleteMediaSubtitle(subtitle)));
        await Promise.all([
          this.deleteMediaSource(<any>deletedMedia.movie.source, session),
          this.deleteMediaStreams(<any>deletedMedia.movie.streams, session)
        ]);
      } else if (deletedMedia.type === MediaType.TV) {
        await Promise.all(deletedMedia.tv.episodes.map(episodeId => this.deleteEpisodeById(<any>episodeId, session)));
      }
      await this.auditLogService.createLog(authUser._id, deletedMedia._id, Media.name, AuditLogType.MEDIA_DELETE);
    });
  }

  async addMediaVideo(id: string, addMediaVideoDto: AddMediaVideoDto, authUser: AuthUserDto) {
    const urlMatch = addMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
    if (!urlMatch || urlMatch[1].length !== 11)
      throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube Url' }, HttpStatus.BAD_REQUEST);
    const video = new MediaVideo();
    video._id = await createSnowFlakeIdAsync();
    video.name = addMediaVideoDto.name;
    video.key = urlMatch[1];
    video.site = MediaVideoSite.YOUTUBE;
    const media = await this.mediaModel.findById(id).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.videos.find(v => v.key === urlMatch[1]))
      throw new HttpException({ code: StatusCode.MEDIA_VIDEO_EXIST, message: 'This video has already been added' }, HttpStatus.BAD_REQUEST);
    media.videos.push(video);
    await Promise.all([
      media.save(),
      this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_CREATE)
    ]);
    return media.videos;
  }

  async findAllMediaVideos(id: string) {
    const media = await this.mediaModel.findById(id, { videos: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.videos)
      return [];
    return media.videos;
  }

  async deleteMediaVideo(id: string, videoId: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOneAndUpdate(
      { _id: id, videos: { $elemMatch: { _id: videoId } } },
      { $pull: { videos: { _id: videoId } } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    await this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MEDIA_VIDEO_DELETE);
    return media.videos;
  }

  async uploadMediaPoster(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const media = await this.mediaModel.findById(id, { poster: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const posterId = await createSnowFlakeIdAsync();
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
    return plainToInstance(MediaDetails, media.toObject());
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
  }

  async uploadMediaBackdrop(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const media = await this.mediaModel.findById(id, { backdrop: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const backdropId = await createSnowFlakeIdAsync();
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
    return plainToInstance(MediaDetails, media.toObject());
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
    const subtitleId = await createSnowFlakeIdAsync();
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
    try {
      await Promise.all([
        media.save(),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SUBTITLE_CREATE)
      ]);
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, saveFile);
      throw e;
    }
    return plainToInstance(MediaSubtitle, media.movie.subtitles.toObject());
  }

  async findAllMovieSubtitles(id: string) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, {
      'movie.subtitles._id': 1, 'movie.subtitles.language': 1
    }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
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
    driveSession._id = await createSnowFlakeIdAsync();
    driveSession.filename = trimmedFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>authUser._id;
    driveSession.expiry = new Date(Date.now() + 604800000);
    const uploadSession = await this.googleDriveService.createUploadSession(trimmedFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  async saveMovieSource(id: string, sessionId: string, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: <any>authUser._id })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, displayName: 1 })
      .exec();
    if (!uploadSession)
      throw new HttpException({ code: StatusCode.DRIVE_SESSION_NOT_FOUND, message: 'Upload session not found' }, HttpStatus.NOT_FOUND);
    const fileInfo = await this.googleDriveService.findId(saveMediaSourceDto.fileId, uploadSession.storage);
    if (fileInfo.trashed) {
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_NOT_FOUND, message: 'File not found' }, HttpStatus.NOT_FOUND);
    }
    // Validate uploaded file
    if (fileInfo.name !== uploadSession.filename || +fileInfo.size != uploadSession.size || fileInfo.mimeType !== uploadSession.mimeType) {
      await this.googleDriveService.deleteFolder(uploadSession._id, uploadSession.storage);
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'You have uploaded an invalid file' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Add original source to media
      const mediaSource = new this.mediaStorageModel({
        _id: uploadSession._id,
        type: MediaStorageType.SOURCE,
        name: uploadSession.filename,
        path: fileInfo.id,
        mimeType: uploadSession.mimeType,
        size: uploadSession.size,
        media: media._id,
        storage: uploadSession.storage._id
      });
      media.movie.source = uploadSession._id;
      media.movie.status = MediaSourceStatus.PROCESSING;
      media.pStatus = MediaStatus.PROCESSING;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(uploadSession.storage._id, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SOURCE_CREATE)
      ]);
    });
    // Create transcode queue
    uploadSession.depopulate('storage');
    const streamSettings = await this.settingsService.findStreamSettings();
    const jobs = [];
    for (let i = 0; i < STREAM_CODECS.length; i++) {
      if (streamSettings.defaultStreamCodecs & STREAM_CODECS[i]) {
        jobs.push({
          name: STREAM_CODECS[i].toString(),
          data: {
            ...uploadSession.toObject(),
            media: media._id,
            driveId: fileInfo.driveId,
            teamDriveId: fileInfo.teamDriveId,
            audioParams: streamSettings.streamAudioParams,
            h264Params: streamSettings.streamH264Params,
            vp9Params: streamSettings.streamVP9Params,
            av1Params: streamSettings.streamAV1Params,
            qualityList: streamSettings.streamQualityList
          }
        });
      }
    }
    await this.videoTranscodeQueue.addBulk(jobs);
  }

  async deleteMovieSource(id: string, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.deleteMediaSource(<any>media.movie.source, session),
        this.deleteMediaStreams(<any>media.movie.streams, session)
      ]);
      media.movie.source = undefined;
      media.movie.streams = undefined;
      media.movie.status = MediaSourceStatus.PENDING;
      media.pStatus = MediaStatus.PENDING;
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, media._id, Media.name, AuditLogType.MOVIE_SOURCE_DELETE)
      ]);
    });
  }

  async addMovieStream(addMediaStreamDto: AddMediaStreamDto) {
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      return;
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.googleDriveService.findPath(filePath, addMediaStreamDto.storage);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.STREAM,
        name: addMediaStreamDto.fileName,
        path: fileInfo.id,
        quality: addMediaStreamDto.quality,
        codec: addMediaStreamDto.codec,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        media: addMediaStreamDto.media,
        storage: addMediaStreamDto.storage
      });
      media.movie.streams.push(addMediaStreamDto.streamId);
      media.movie.status = MediaSourceStatus.READY;
      media.pStatus = MediaStatus.DONE;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(addMediaStreamDto.storage, addMediaStreamDto.streamId, +fileInfo.size, session),
        stream.save({ session }),
        media.save({ session })
      ]);
    });
  }

  handleMovieStreamQueueDone(infoData: MediaQueueStatusDto) {
    return Promise.all([
      this.mediaModel.updateOne({ _id: infoData.media }, { 'movie.status': MediaSourceStatus.DONE }).exec(),
      this.httpEmailService.sendEmailSendGrid(infoData.user.email, infoData.user.username, 'Your movie is ready',
        SendgridTemplate.MEDIA_PROCESSING_SUCCESS, {
        recipient_name: infoData.user.username,
        button_url: `${this.configService.get('WEBSITE_URL')}/watch/${infoData.media}`
      })
    ]);
  }

  async handleMovieStreamQueueError(errData: MediaQueueStatusDto) {
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
        media.pStatus = MediaStatus.PENDING;
        await media.save({ session });
      }
      await this.httpEmailService.sendEmailSendGrid(errData.user.email, errData.user.username, 'Failed to process your movie',
        SendgridTemplate.MEDIA_PROCESSING_FAILURE, {
        recipient_name: errData.user.username
      });
    });
  }

  async findAllMovieStreams(id: string) {
    const media = await this.mediaModel.findOneAndUpdate({ _id: id, type: MediaType.MOVIE },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1 } })
      .select({ _id: 1, movie: 1, pStatus: 1 })
      .populate({ path: 'movie.streams', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } })
      .populate('movie.subtitles')
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.pStatus !== MediaStatus.DONE)
      throw new HttpException({ code: StatusCode.MOVIE_NOT_READY, message: 'Movie is not ready' }, HttpStatus.NOT_FOUND);
    if (!media.movie.streams?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(MediaStream, media.movie);
  }

  async addTVEpisode(id: string, addTVEpisodeDto: AddTVEpisodeDto, authUser: AuthUserDto) {
    const { episodeNumber, name, overview, runtime, airDate, visibility } = addTVEpisodeDto;
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
      episode._id = await createSnowFlakeIdAsync();
      episode.episodeNumber = episodeNumber;
      episode.name = name;
      episode.overview = overview;
      episode.runtime = runtime;
      episode.airDate = airDate;
      episode.visibility = visibility;
      episode.media = media._id;
      episode.status = MediaSourceStatus.PENDING;
      media.tv.episodes.push(episode._id);
      media.tv.episodeCount = media.tv.episodes.length;
      await Promise.all([
        episode.save({ session }),
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_CREATE)
      ]);
    });
    return plainToInstance(TVEpisodeEntity, episode.toObject());
  }

  async findAllTVEpisodes(id: string, acceptLanguage: string, authUser: AuthUserDto) {
    const population: any = {
      path: 'tv.episodes',
      select: {
        _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, _translations: 1, createdAt: 1,
        updatedAt: 1
      }
    };
    !authUser.hasPermission && (population.match = { status: { $in: [MediaSourceStatus.READY, MediaSourceStatus.DONE] } });
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { tv: 1 })
      .populate(population)
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguageArray<TVEpisode>(acceptLanguage, media.tv.episodes);
    return plainToInstance(TVEpisodeEntity, translated);
  }

  async updateTVEpisode(id: string, episodeId: string, updateTVEpisodeDto: UpdateTVEpisodeDto, authUser: AuthUserDto) {
    if (!Object.keys(updateTVEpisodeDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: <any>id },
      { episodeNumber: 1, name: 1, overview: 1, runtime: 1, still: 1, airDate: 1, visibility: 1 }
    ).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (updateTVEpisodeDto.translate && updateTVEpisodeDto.translate !== I18N_DEFAULT_LANGUAGE) {
      updateTVEpisodeDto.name != undefined && episode.set(`_translations.${updateTVEpisodeDto.translate}.name`, updateTVEpisodeDto.name);
      updateTVEpisodeDto.overview != undefined && episode.set(`_translations.${updateTVEpisodeDto.translate}.overview`, updateTVEpisodeDto.overview);
    }
    else {
      if (updateTVEpisodeDto.episodeNumber != undefined && updateTVEpisodeDto.episodeNumber !== episode.episodeNumber) {
        const episodeExist = await this.tvEpisodeModel.findOne({ episodeNumber: updateTVEpisodeDto.episodeNumber, media: <any>id })
          .lean().exec();
        if (episodeExist)
          throw new HttpException({ code: StatusCode.EPISODE_NUMBER_EXIST, message: 'Episode number has already been used' }, HttpStatus.BAD_REQUEST);
        episode.episodeNumber = updateTVEpisodeDto.episodeNumber;
      }
      updateTVEpisodeDto.name !== undefined && (episode.name = updateTVEpisodeDto.name);
      updateTVEpisodeDto.overview !== undefined && (episode.overview = updateTVEpisodeDto.overview);
      updateTVEpisodeDto.runtime != undefined && (episode.runtime = updateTVEpisodeDto.runtime);
      updateTVEpisodeDto.airDate != undefined && (episode.airDate = updateTVEpisodeDto.airDate);
      updateTVEpisodeDto.visibility !== undefined && (episode.visibility = updateTVEpisodeDto.visibility);
    }
    await Promise.all([
      episode.save(),
      this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_UPDATE)
    ]);
    return plainToInstance(TVEpisodeEntity, episode.toObject());
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
      await Promise.all([
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_DELETE)
      ]);
    });
  }

  private async deleteEpisodeById(episodeId: string, session: ClientSession) {
    const episode = await this.tvEpisodeModel.findOneAndDelete({ _id: episodeId }, { session }).lean();
    await this.deleteMediaImage(episode.still, AzureStorageContainer.STILLS);
    await Promise.all(episode.subtitles.map(subtitle => this.deleteMediaSubtitle(subtitle)));
    await Promise.all([
      this.deleteMediaSource(<any>episode.source, session),
      this.deleteMediaStreams(<any>episode.streams, session)
    ]);
    return episode;
  }

  async uploadTVEpisodeStill(id: string, episodeId: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: <any>id },
      { episodeNumber: 1, name: 1, overview: 1, runtime: 1, still: 1, airDate: 1, visibility: 1 }
    ).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const stillId = await createSnowFlakeIdAsync();
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
    return plainToInstance(TVEpisodeEntity, episode.toObject());
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
  }

  async uploadTVEpisodeSubtitle(id: string, episodeId: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    const language = await this.validateSubtitle(file);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.subtitles?.length) {
      const subtitle = await this.mediaStorageModel.findOne({ _id: { $in: episode.subtitles }, language: language }).lean().exec();
      if (subtitle)
        throw new HttpException({ code: StatusCode.SUBTITLE_EXIST, message: 'Subtitle with this language has already been added' }, HttpStatus.BAD_REQUEST);
    }
    const subtitleId = await createSnowFlakeIdAsync();
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
      try {
        await Promise.all([
          episode.save({ session }),
          this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SUBTITLE_CREATE)
        ]);
      } catch (e) {
        await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, saveFile);
        throw e;
      }
    });
    return plainToInstance(MediaSubtitle, episode.subtitles.toObject());
  }

  async findAllTVEpisodeSubtitles(id: string, episodeId: string) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, {
      'subtitles._id': 1,
      'subtitles.language': 1
    }).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
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
    driveSession._id = await createSnowFlakeIdAsync();
    driveSession.filename = trimmedFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>authUser._id;
    driveSession.expiry = new Date(Date.now() + 604800000);
    const uploadSession = await this.googleDriveService.createUploadSession(trimmedFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  async saveTVEpisodeSource(id: string, episodeId: string, sessionId: string, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, pStatus: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { _id: 1, source: 1, status: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: <any>authUser._id })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, displayName: 1 })
      .exec();
    if (!uploadSession)
      throw new HttpException({ code: StatusCode.DRIVE_SESSION_NOT_FOUND, message: 'Upload session not found' }, HttpStatus.NOT_FOUND);
    const fileInfo = await this.googleDriveService.findId(saveMediaSourceDto.fileId, uploadSession.storage);
    if (fileInfo.trashed) {
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_NOT_FOUND, message: 'File not found' }, HttpStatus.NOT_FOUND);
    }
    // Validate uploaded file
    if (fileInfo.name !== uploadSession.filename || +fileInfo.size != uploadSession.size || fileInfo.mimeType !== uploadSession.mimeType) {
      await this.googleDriveService.deleteFolder(uploadSession._id, uploadSession.storage);
      await this.driveSessionModel.deleteOne({ _id: sessionId }).exec();
      throw new HttpException({ code: StatusCode.DRIVE_FILE_INVALID, message: 'You have uploaded an invalid file' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Add original source to media
      const mediaSource = new this.mediaStorageModel({
        _id: uploadSession._id,
        type: MediaStorageType.SOURCE,
        name: uploadSession.filename,
        path: fileInfo.id,
        mimeType: uploadSession.mimeType,
        size: uploadSession.size,
        media: media._id,
        episode: episode.episodeNumber,
        storage: uploadSession.storage._id
      });
      episode.source = uploadSession._id;
      episode.status = MediaSourceStatus.PROCESSING;
      media.pStatus = MediaStatus.PROCESSING;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(uploadSession.storage._id, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        episode.save({ session }),
        media.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SOURCE_CREATE)
      ]);
    });
    // Create transcode queue
    uploadSession.depopulate('storage');
    const streamSettings = await this.settingsService.findStreamSettings();
    const jobs = [];
    for (let i = 0; i < STREAM_CODECS.length; i++) {
      if (streamSettings.defaultStreamCodecs & STREAM_CODECS[i]) {
        jobs.push({
          name: STREAM_CODECS[i].toString(),
          data: {
            ...uploadSession.toObject(),
            media: media._id,
            episode: episode._id,
            driveId: fileInfo.driveId,
            teamDriveId: fileInfo.teamDriveId,
            audioParams: streamSettings.streamAudioParams,
            h264Params: streamSettings.streamH264Params,
            vp9Params: streamSettings.streamVP9Params,
            av1Params: streamSettings.streamAV1Params,
            qualityList: streamSettings.streamQualityList
          }
        });
      }
    }
    await this.videoTranscodeQueue.addBulk(jobs);
  }

  async deleteTVEpisodeSource(id: string, episodeId: string, authUser: AuthUserDto) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { _id: 1, source: 1, streams: 1, status: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.deleteMediaSource(<any>episode.source, session),
        this.deleteMediaStreams(<any>episode.streams, session)
      ]);
      episode.source = undefined;
      episode.streams = undefined;
      episode.status = MediaSourceStatus.PENDING;
      await Promise.all([
        episode.save({ session }),
        this.auditLogService.createLog(authUser._id, episode._id, TVEpisode.name, AuditLogType.EPISODE_SOURCE_DELETE)
      ]);
    });
  }

  async addTVEpisodeStream(addMediaStreamDto: AddMediaStreamDto) {
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.TV }, { _id: 1, pStatus: 1 })
      .exec();
    const episode = await this.tvEpisodeModel.findOne({ _id: addMediaStreamDto.episode, media: <any>addMediaStreamDto.media },
      { _id: 1, streams: 1, status: 1 }
    ).exec();
    if (!media || !episode)
      return;
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.googleDriveService.findPath(filePath, addMediaStreamDto.storage);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.STREAM,
        name: addMediaStreamDto.fileName,
        path: fileInfo.id,
        quality: addMediaStreamDto.quality,
        codec: addMediaStreamDto.codec,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        media: addMediaStreamDto.media,
        episode: addMediaStreamDto.episode,
        storage: addMediaStreamDto.storage
      });
      episode.streams.push(addMediaStreamDto.streamId);
      episode.status = MediaSourceStatus.READY;
      media.pStatus = MediaStatus.DONE;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(addMediaStreamDto.storage, addMediaStreamDto.streamId, +fileInfo.size, session),
        stream.save({ session }),
        episode.save({ session }),
        media.save({ session })
      ]);
    });
  }

  async handleTVEpisodeStreamQueueDone(infoData: MediaQueueStatusDto) {
    const episode = await this.tvEpisodeModel.findOneAndUpdate(
      { _id: infoData.episode, media: infoData.media },
      { status: MediaSourceStatus.DONE }
    ).lean().exec();
    await this.httpEmailService.sendEmailSendGrid(infoData.user.email, infoData.user.username, 'Your episode is ready',
      SendgridTemplate.MEDIA_PROCESSING_SUCCESS, {
      recipient_name: infoData.user.username,
      button_url: `${this.configService.get('WEBSITE_URL')}/watch/${infoData.media}?episode=${episode.episodeNumber}`
    });
  }

  async handleTVEpisodeStreamQueueError(errData: MediaQueueStatusDto) {
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
        await episode.save({ session });
      }
      await this.httpEmailService.sendEmailSendGrid(errData.user.email, errData.user.username, 'Failed to process your episode',
        SendgridTemplate.MEDIA_PROCESSING_FAILURE, {
        recipient_name: errData.user.username
      });
    });
  }

  async findAllTVEpisodeStreams(id: string, episodeNumber: number) {
    const media = await this.mediaModel.findOneAndUpdate(
      { _id: id, type: MediaType.TV },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1 } }
    ).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.pStatus !== MediaStatus.DONE)
      throw new HttpException({ code: StatusCode.TV_NOT_READY, message: 'TV Show is not ready' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOneAndUpdate(
      { media: id, episodeNumber: episodeNumber },
      { $inc: { views: 1 } }
    ).populate(
      { path: 'streams', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } },
    ).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (!episode.streams?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(MediaStream, episode);
  }

  @Cron('0 0 0 * * *')
  async removeOldUploadSessionsCron() {
    const uploadSessions = await this.driveSessionModel.find({ expiry: { $lte: new Date() } }).populate('storage').lean().exec();
    await this.driveSessionModel.deleteMany({ expiry: { $lte: new Date() } }).exec();
    for (let i = 0; i < uploadSessions.length; i++) {
      await this.googleDriveService.deleteFolder(uploadSessions[i]._id, uploadSessions[i].storage);
    }
  }

  @Cron('0 0 0 * * *')
  async resetDailyViewsCron() {
    await this.mediaModel.updateMany({ dailyViews: { $gt: 0 } }, { dailyViews: 0 }).exec();
  }

  @Cron('0 0 0 * * 1')
  async resetWeeklyViewsCron() {
    await this.mediaModel.updateMany({ weeklyViews: { $gt: 0 } }, { weeklyViews: 0 }).exec();
  }

  async updateMediaRating(id: string, incCount: number, incScore: number, session?: ClientSession) {
    const media = await this.mediaModel.findOne({ _id: id, pStatus: MediaStatus.DONE }, undefined, { session });
    if (!media) return;
    media.ratingCount += incCount;
    media.ratingScore += incScore;
    media.ratingAverage = +((media.ratingScore / media.ratingCount).toFixed(1));
    await media.save({ session });
    return media.toObject();
  }

  findAvailableMedia(id: string, session?: ClientSession) {
    return this.mediaModel.findOne({ _id: id, pStatus: MediaStatus.DONE }, {}, { session }).lean();
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
    if (!firstLine.endsWith('WEBVTT'))
      throw new HttpException({ code: StatusCode.INVALID_SUBTITLE, message: 'Subtitle is invalid' }, HttpStatus.BAD_REQUEST);
    return language;
  }

  private async deleteMediaSubtitle(subtitle: MediaFile) {
    if (!subtitle) return;
    await this.azureBlobService.delete(AzureStorageContainer.SUBTITLES, `${subtitle._id}/${subtitle.name}`);
  }

  private async deleteMediaSource(id: string, session?: ClientSession) {
    if (!id)
      return;
    const source = await this.mediaStorageModel.findByIdAndDelete(id, { session }).populate('storage').lean();
    if (source) {
      await this.externalStoragesService.deleteFileFromStorage(source.storage._id, id, source.size, session);
      this.googleDriveService.deleteFolder(id, source.storage, 5)
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

  deleteGenreMedia(genreId: string, mediaIds: string[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { genres: genreId } }, { session });
  }

  deleteProducerMedia(producerId: string, mediaIds: string[], session?: ClientSession) {
    if (mediaIds.length)
      return this.mediaModel.updateMany({ _id: { $in: mediaIds } }, { $pull: { producers: producerId } }, { session });
  }
}
