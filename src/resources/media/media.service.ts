import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, LeanDocument, Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { plainToClass, plainToClassFromExist } from 'class-transformer';
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
import { Media, MediaDocument } from '../../schemas/media.schema';
import { MediaStorage, MediaStorageDocument } from '../../schemas/media-storage.schema';
import { DriveSession, DriveSessionDocument } from '../../schemas/drive-session.schema';
import { Movie } from '../../schemas/movie.schema';
import { TVShow } from '../../schemas/tv-show.schema';
import { TVEpisode, TVEpisodeDocument } from '../../schemas/tv-episode.schema';
import { MediaVideo } from '../../schemas/media-video.schema';
import { GenresService } from '../genres/genres.service';
import { ProducersService } from '../producers/producers.service';
import { SettingsService } from '../settings/settings.service';
import { ImgurService } from '../../common/imgur/imgur.service';
import { DropboxService } from '../../common/dropbox/dropbox.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { HttpEmailService } from '../../common/http-email/http-email.service';
import { MediaType } from '../../enums/media-type.enum';
import { MediaVideoSite } from '../../enums/media-video-site.enum';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { TaskQueue } from '../../enums/task-queue.enum';
import { MediaStorageType } from '../../enums/media-storage-type.enum';
import { StreamCodec } from '../../enums/stream-codec.enum';
import { MediaStatus } from '../../enums/media-status.enum';
import { MediaSourceStatus } from '../../enums/media-source-status.enum';
import { MailgunTemplate } from '../../enums/mailgun-template.enum';
import { Paginated } from '../roles/entities/paginated.entity';
import { Media as MediaEntity } from './entities/media.entity';
import { MediaDetails } from './entities/media-details.entity';
import { MediaSubtitle } from './entities/media-subtitle.entity';
import { MediaStream } from './entities/media-stream.entity';
import { TVEpisode as TVEpisodeEntity } from './entities/tv-episode.entity';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { convertToLanguage, convertToLanguageArray } from '../../utils/i18n-transform.util';
import { readFirstLine } from '../../utils/subtitle.util';
import { I18N_DEFAULT_LANGUAGE } from '../../config';
import { AddTVEpisodeDto } from './dto/add-tv-episode.dto';
import { createSnowFlakeIdAsync } from '../../utils/snowflake-id.util';
import { UpdateTVEpisodeDto } from './dto/update-tv-episode.dto';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name) private mediaModel: Model<MediaDocument>, @InjectModel(MediaStorage.name) private mediaStorageModel: Model<MediaStorageDocument>,
    @InjectModel(DriveSession.name) private driveSessionModel: Model<DriveSessionDocument>, @InjectModel(TVEpisode.name) private tvEpisodeModel: Model<TVEpisodeDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection, @InjectQueue(TaskQueue.VIDEO_TRANSCODE) private videoTranscodeQueue: Queue,
    @Inject(forwardRef(() => GenresService)) private genresService: GenresService, @Inject(forwardRef(() => ProducersService)) private producersService: ProducersService,
    private externalStoragesService: ExternalStoragesService, private settingsService: SettingsService, private httpEmailService: HttpEmailService,
    private googleDriveService: GoogleDriveService, private imgurService: ImgurService, private dropboxService: DropboxService,
    private configService: ConfigService) { }

  async create(createMediaDto: CreateMediaDto, authUser: AuthUserDto) {
    const { type, title, originalTitle, overview, originalLanguage, runtime, adult, releaseDate, lastAirDate, status, visibility } = createMediaDto;
    const slug = (originalTitle?.toLowerCase() === title.toLowerCase()) ?
      slugify(title, { lower: true }) :
      slugify(`${title} ${originalTitle}`, { lower: true });
    const media = new this.mediaModel({
      type, title, originalTitle, slug, overview, originalLanguage, runtime, adult,
      releaseDate, status, visibility, uploadStatus: MediaStatus.PROCESSING, addedBy: authUser._id
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
    let newMedia: MediaDocument;
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
      newMedia = await media.save({ session });
    });
    return plainToClass(MediaDetails, newMedia.toObject());
  }

  async findAll(paginateMediaDto: PaginateMediaDto, acceptLanguage: string, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'title', 'originalLanguage', 'releaseDate.year', 'views', 'dailyViews', 'weeklyViews', 'monthlyViews',
      'yearlyViews', 'ratingCount', 'ratingAverage', 'updatedAt'];
    const fields = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, runtime: 1, episodeCount: 1, poster: 1, backdrop: 1, genres: 1,
      originalLanguage: 1, adult: 1, releaseDate: 1, views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1, yearlyViews: 1,
      ratingCount: 1, ratingAverage: 1, visibility: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const { adult, page, limit, sort, search, type, originalLanguage, year, genres } = paginateMediaDto;
    const filters: any = {};
    type !== undefined && (filters.type = type);
    originalLanguage !== undefined && (filters.originalLanguage = originalLanguage);
    year !== undefined && (filters['releaseDate.year'] = year);
    adult !== undefined && (filters.adult = adult);
    if (Array.isArray(genres))
      filters.genres = { $in: genres };
    else if (genres !== undefined)
      filters.genres = genres;
    !authUser.hasPermission && (filters.uploadStatus = MediaStatus.DONE);
    const aggregation = new MongooseAggregation({ page, limit, fields, sortQuery: sort, search, sortEnum, fullTextSearch: true });
    Object.keys(filters).length && (aggregation.filters = filters);
    const lookups: LookupOptions[] = [{
      from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
      project: { _id: 1, name: 1, _translations: 1 }
    }, {
      from: 'mediastorages', localField: 'poster', foreignField: '_id', as: 'poster', isArray: false
    }, {
      from: 'mediastorages', localField: 'backdrop', foreignField: '_id', as: 'backdrop', isArray: false
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
      producers: 1, credits: 1, runtime: 1, episodeCount: 1, movie: 1, tv: 1, videos: 1, adult: 1, releaseDate: 1, status: 1,
      views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1, yearlyViews: 1, ratingCount: 1, ratingAverage: 1, _translations: 1,
      createdAt: 1, updatedAt: 1
    };
    const lookups: any[] = [
      { path: 'genres', select: { _id: 1, name: 1, _translations: 1 } },
      { path: 'producers', select: { _id: 1, name: 1 } },
      { path: 'poster' },
      { path: 'backdrop' },
      { path: 'tv.episodes', populate: { path: 'still' } }
    ];
    if (authUser.hasPermission) {
      project.uploadStatus = 1;
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
    return plainToClass(MediaDetails, translated);
  }

  async update(id: string, updateMediaDto: UpdateMediaDto) {
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
      { path: 'poster' },
      { path: 'backdrop' },
      { path: 'addedBy', select: { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 } }
    ]);
    const translated = convertToLanguage<LeanDocument<Media>>(updateMediaDto.translate, media.toObject(), { populate: ['genres'] });
    return plainToClass(MediaDetails, translated);
  }

  async remove(id: string) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedMedia = await this.mediaModel.findByIdAndDelete(id, { session }).lean();
      if (!deletedMedia)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.deleteMediaImage(<any>deletedMedia.poster, session),
        this.deleteMediaImage(<any>deletedMedia.backdrop, session),
        this.genresService.deleteMediaGenres(id, <any[]>deletedMedia.genres, session),
        this.producersService.deleteMediaProducers(id, <any[]>deletedMedia.producers, session)
      ]);
      if (deletedMedia.type === MediaType.MOVIE) {
        await Promise.all(deletedMedia.movie.subtitles.map(subtitle => this.deleteMediaSubtitle(<any>subtitle, session)));
        await Promise.all([
          this.deleteMediaSource(<any>deletedMedia.movie.source, session),
          this.deleteMediaStreams(<any>deletedMedia.movie.streams, session)
        ]);
      } else if (deletedMedia.type === MediaType.TV) {
        await Promise.all(deletedMedia.tv.episodes.map(episodeId => this.deleteEpisodeById(<any>episodeId, session)));
      }
    });
  }

  async addMediaVideo(id: string, addMediaVideoDto: AddMediaVideoDto) {
    // TODO: Create an audit log for added users
    const urlMatch = addMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
    if (!urlMatch || urlMatch[1].length !== 11)
      throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube Url' }, HttpStatus.BAD_REQUEST);
    const video = new MediaVideo();
    video._id = await createSnowFlakeIdAsync();
    video.key = urlMatch[1];
    video.site = MediaVideoSite.YOUTUBE;
    const media = await this.mediaModel.findById(id).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.videos.find(v => v.key === urlMatch[1]))
      throw new HttpException({ code: StatusCode.MEDIA_VIDEO_EXIST, message: 'This video has already been added' }, HttpStatus.BAD_REQUEST);
    media.videos.push(video);
    await media.save();
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

  async deleteMediaVideo(id: string, videoId: string) {
    const media = await this.mediaModel.findOneAndUpdate(
      { $and: [{ _id: id }, { videos: { $elemMatch: { _id: videoId } } }] },
      { $pull: { videos: { _id: videoId } } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    return media.videos;
  }

  async uploadMediaPoster(id: string, file: Storage.MultipartFile) {
    const media = await this.mediaModel.findById(id, { poster: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const image = await this.imgurService.uploadPoster(file.filepath, file.filename);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (media.poster)
        await this.deleteMediaImage(<any>media.poster, session);
      const poster = new this.mediaStorageModel();
      poster._id = await createSnowFlakeIdAsync();
      poster.type = MediaStorageType.POSTER;
      poster.name = image.link.split('/').pop();
      poster.path = image.id;
      poster.color = file.color;
      poster.size = image.size;
      poster.media = <any>id;
      poster.storage = <any>image.storage;
      media.poster = poster._id;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>image.storage, poster._id, image.size, session),
        poster.save({ session }),
        media.save({ session })
      ]);
    });
    await media.populate('poster');
    return plainToClass(MediaDetails, media.toObject());
  }

  async deleteMediaPoster(id: string) {
    const media = await this.mediaModel.findById(id, { poster: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (media.poster) {
        await this.deleteMediaImage(<any>media.poster, session);
        media.poster = undefined;
        await media.save({ session });
      }
    });
  }

  async uploadMediaBackdrop(id: string, file: Storage.MultipartFile) {
    const media = await this.mediaModel.findById(id, { backdrop: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const image = await this.imgurService.uploadBackdrop(file.filepath, file.filename);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (media.backdrop)
        await this.deleteMediaImage(<any>media.backdrop, session);
      const backdrop = new this.mediaStorageModel();
      backdrop._id = await createSnowFlakeIdAsync();
      backdrop.type = MediaStorageType.BACKDROP;
      backdrop.name = image.link.split('/').pop();
      backdrop.path = image.id;
      backdrop.color = file.color;
      backdrop.size = image.size;
      backdrop.media = <any>id;
      backdrop.storage = <any>image.storage;
      media.backdrop = backdrop._id;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>image.storage, backdrop._id, image.size, session),
        backdrop.save({ session }),
        media.save({ session })
      ]);
    });
    await media.populate('backdrop');
    return plainToClass(MediaDetails, media.toObject());
  }

  async deleteMediaBackdrop(id: string) {
    const media = await this.mediaModel.findById(id, { backdrop: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (media.backdrop) {
        await this.deleteMediaImage(<any>media.backdrop, session);
        media.backdrop = undefined;
        await media.save({ session });
      }
    });
  }

  private async deleteMediaImage(id: string, session: ClientSession) {
    if (!id)
      return;
    const oldImage = await this.mediaStorageModel.findByIdAndDelete(id, { session }).populate('storage').lean();
    if (oldImage) {
      await this.externalStoragesService.deleteFileFromStorage(oldImage.storage._id, id, oldImage.size, session);
      this.imgurService.deleteImage(oldImage.path, oldImage.storage, 5);
    }
  }

  async uploadMovieSubtitle(id: string, file: Storage.MultipartFile) {
    const language = await this.validateSubtitle(file);
    const media = await this.mediaModel.findOne({ $and: [{ _id: id }, { type: MediaType.MOVIE }] }, { 'movie.subtitles': 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie?.subtitles?.length) {
      const subtitle = await this.mediaStorageModel.findOne({ $and: [{ _id: { $in: media.movie.subtitles } }, { language: language }] }).lean().exec();
      if (subtitle)
        throw new HttpException({ code: StatusCode.SUBTITLE_EXIST, message: 'Subtitle with this language has already been added' }, HttpStatus.BAD_REQUEST);
    }
    const subtitle = new this.mediaStorageModel();
    subtitle._id = await createSnowFlakeIdAsync();
    const subtitleFile = await this.dropboxService.uploadSubtitle(file.filepath, `${subtitle._id}/${file.filename}`);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      subtitle.type = MediaStorageType.SUBTITLE;
      subtitle.name = file.filename;
      subtitle.path = subtitleFile.path;
      subtitle.size = subtitleFile.size;
      subtitle.language = language;
      subtitle.media = <any>id;
      subtitle.storage = <any>subtitleFile.storage;
      media.movie.subtitles.push(subtitle._id);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>subtitleFile.storage, subtitle._id, subtitle.size, session),
        subtitle.save({ session }),
        media.save({ session })
      ]);
    });
    return plainToClass(MediaSubtitle, media.movie.subtitles);
  }

  async findAllMovieSubtitles(id: string) {
    const media = await this.mediaModel.findOne({ $and: [{ _id: id }, { type: MediaType.MOVIE }] }, { 'movie.subtitles': 1 })
      .populate('movie.subtitles', { _id: 1, language: 1 }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (!media.movie.subtitles)
      return [];
    return media.movie.subtitles;
  }

  async deleteMovieSubtitle(id: string, subtitleId: string) {
    const media = await this.mediaModel.findOne({
      $and: [
        { _id: id },
        { type: MediaType.MOVIE },
        { 'movie.subtitles': subtitleId }
      ]
    }, { 'movie.subtitles': 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await this.deleteMediaSubtitle(subtitleId, session);
      media.movie.subtitles.pull(subtitleId);
      await media.save({ session });
    });
  }

  async uploadMovieSource(id: string, addMediaSourceDto: AddMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.BAD_REQUEST);
    const { filename, size, mimeType } = addMediaSourceDto;
    const slugFilename = slugify(filename, { lower: true, remove: /[^0-9a-zA-Z.\-_\s]/g });
    const driveSession = new this.driveSessionModel();
    driveSession._id = await createSnowFlakeIdAsync();
    driveSession.filename = slugFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>authUser._id;
    const uploadSession = await this.googleDriveService.createUploadSession(slugFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  async saveMovieSource(id: string, sessionId: string, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.MOVIE }, { _id: 1, movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const uploadSession = await this.driveSessionModel.findOne({ $and: [{ _id: sessionId }, { user: <any>authUser._id }] })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, displayName: 1 })
      .select({ createdAt: 0, __v: 0 })
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
        quality: 0,
        codec: 0,
        mimeType: uploadSession.mimeType,
        size: uploadSession.size,
        media: media._id,
        storage: uploadSession.storage._id
      });
      media.movie.source = uploadSession._id;
      media.movie.status = MediaSourceStatus.PROCESSING;
      media.uploadStatus = MediaStatus.PROCESSING;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(uploadSession.storage._id, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        media.save({ session })
      ]);
      // Create transcode queue
      uploadSession.depopulate('storage');
      const defaultStreamCodecs = await this.settingsService.findDefaultStreamCodecs();
      const jobs = [];
      const streamCodecKeys = Object.keys(StreamCodec);
      for (let i = 0; i < streamCodecKeys.length; i++) {
        if (defaultStreamCodecs & StreamCodec[streamCodecKeys[i]]) {
          jobs.push({
            name: StreamCodec[streamCodecKeys[i]].toString(),
            data: { ...uploadSession.toObject(), media: media._id, driveId: fileInfo.driveId, teamDriveId: fileInfo.teamDriveId }
          });
        }
      }
      await this.videoTranscodeQueue.addBulk(jobs);
    });
  }

  async deleteMovieSource(id: string) {
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
      media.uploadStatus = MediaStatus.PENDING;
      await media.save({ session });
    });
  }

  async addMovieStream(addMediaStreamDto: AddMediaStreamDto) {
    const media = await this.mediaModel.findOne({ $and: [{ _id: addMediaStreamDto.media }, { type: MediaType.MOVIE }] }, { _id: 1, movie: 1 }).exec();
    if (!media)
      return;
    const filePath = `${addMediaStreamDto.sourceId}/${addMediaStreamDto.streamId}/${addMediaStreamDto.fileName}`;
    const fileInfo = await this.googleDriveService.findPath(filePath, addMediaStreamDto.storage);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const stream = new this.mediaStorageModel({
        _id: addMediaStreamDto.streamId,
        type: MediaStorageType.SOURCE,
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
      media.uploadStatus = MediaStatus.DONE;
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
      this.httpEmailService.sendEmailMailgun(infoData.user.email, infoData.user.username, 'Your movie is ready', MailgunTemplate.MEDIA_PROCESSING_SUCCESS, {
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
        media.uploadStatus = MediaStatus.PENDING;
        await media.save({ session });
      }
      await this.httpEmailService.sendEmailMailgun(errData.user.email, errData.user.username, 'Movie processing failed', MailgunTemplate.MEDIA_PROCESSING_FAILURE, {
        recipient_name: errData.user.username
      });
    });
  }

  async findAllMovieStreams(id: string) {
    const media = await this.mediaModel.findOneAndUpdate({ _id: id, type: MediaType.MOVIE },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1, yearlyViews: 1 } })
      .select({ _id: 1, movie: 1, uploadStatus: 1 })
      .populate({ path: 'movie.streams', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } })
      .populate('movie.subtitles')
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.uploadStatus !== MediaStatus.DONE)
      throw new HttpException({ code: StatusCode.MOVIE_NOT_READY, message: 'Movie is not ready' }, HttpStatus.NOT_FOUND);
    if (!media.movie.streams?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    return plainToClass(MediaStream, media.movie);
  }

  async addTVEpisode(id: string, addTVEpisodeDto: AddTVEpisodeDto) {
    const { episodeNumber, name, overview, runtime, airDate, visibility } = addTVEpisodeDto;
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, tv: 1, episodeCount: 1 }).exec();
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
      media.episodeCount = media.tv.episodes.length;
      await Promise.all([
        episode.save({ session }),
        media.save({ session })
      ]);
    });
    return plainToClass(TVEpisodeEntity, episode.toObject());
  }

  async findAllTVEpisodes(id: string, acceptLanguage: string) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { tv: 1 })
      .populate({
        path: 'tv.episodes',
        select: {
          _id: 1, episodeNumber: 1, name: 1, overview: 1, runtime: 1, airDate: 1, still: 1, views: 1, _translations: 1, createdAt: 1,
          updatedAt: 1
        },
        populate: { path: 'still' }
      })
      .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguageArray<TVEpisode>(acceptLanguage, media.tv.episodes);
    return plainToClass(TVEpisodeEntity, translated);
  }

  async updateTVEpisode(id: string, episodeId: string, updateTVEpisodeDto: UpdateTVEpisodeDto) {
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
    await episode.save();
    await episode.populate('still');
    return plainToClass(TVEpisodeEntity, episode.toObject());
  }

  async deleteTVEpisode(id: string, episodeId: string) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, tv: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const episode = await this.deleteEpisodeById(episodeId, session);
      if (!episode)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      media.tv.episodes.pull(episodeId);
      await media.save({ session });
    });
  }

  private async deleteEpisodeById(episodeId: string, session: ClientSession) {
    const episode = await this.tvEpisodeModel.findOneAndDelete({ _id: episodeId }, { session }).lean();
    await this.deleteMediaImage(<any>episode.still, session);
    await Promise.all(episode.subtitles.map(subtitle => this.deleteMediaSubtitle(<any>subtitle, session)));
    await Promise.all([
      this.deleteMediaSource(<any>episode.source, session),
      this.deleteMediaStreams(<any>episode.streams, session)
    ]);
    return episode;
  }

  async uploadTVEpisodeStill(id: string, episodeId: string, file: Storage.MultipartFile) {
    const episode = await this.tvEpisodeModel.findOne(
      { _id: episodeId, media: <any>id },
      { episodeNumber: 1, name: 1, overview: 1, runtime: 1, still: 1, airDate: 1, visibility: 1 }
    ).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const image = await this.imgurService.uploadStill(file.filepath, file.filename);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (episode.still)
        await this.deleteMediaImage(<any>episode.still, session);
      const still = new this.mediaStorageModel();
      still._id = await createSnowFlakeIdAsync();
      still.type = MediaStorageType.STILL;
      still.name = image.link.split('/').pop();
      still.path = image.id;
      still.color = file.color;
      still.size = image.size;
      still.media = <any>id;
      still.episode = episode._id;
      still.storage = <any>image.storage;
      episode.still = still._id;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>image.storage, still._id, image.size, session),
        still.save({ session }),
        episode.save({ session })
      ]);
    });
    await episode.populate('still');
    return plainToClass(TVEpisodeEntity, episode.toObject());
  }

  async deleteTVEpisodeStill(id: string, episodeId: string) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { still: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (episode.still) {
        await this.deleteMediaImage(<any>episode.still, session);
        episode.still = undefined;
        await episode.save({ session });
      }
    });
  }

  async uploadTVEpisodeSubtitle(id: string, episodeId: string, file: Storage.MultipartFile) {
    const language = await this.validateSubtitle(file);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (episode.subtitles?.length) {
      const subtitle = await this.mediaStorageModel.findOne({ _id: { $in: episode.subtitles }, language: language }).lean().exec();
      if (subtitle)
        throw new HttpException({ code: StatusCode.SUBTITLE_EXIST, message: 'Subtitle with this language has already been added' }, HttpStatus.BAD_REQUEST);
    }
    const subtitle = new this.mediaStorageModel();
    subtitle._id = await createSnowFlakeIdAsync();
    const subtitleFile = await this.dropboxService.uploadSubtitle(file.filepath, `${subtitle._id}/${file.filename}`);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      subtitle.type = MediaStorageType.SUBTITLE;
      subtitle.name = file.filename;
      subtitle.path = subtitleFile.path;
      subtitle.size = subtitleFile.size;
      subtitle.language = language;
      subtitle.media = <any>id;
      subtitle.episode = episode._id;
      subtitle.storage = <any>subtitleFile.storage;
      episode.subtitles.push(subtitle._id);
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>subtitleFile.storage, subtitle._id, subtitle.size, session),
        subtitle.save({ session }),
        episode.save({ session })
      ]);
    });
    return plainToClass(MediaSubtitle, episode.subtitles);
  }

  async findAllTVEpisodeSubtitles(id: string, episodeId: string) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { subtitles: 1 })
      .populate('subtitles', { _id: 1, language: 1 })
      .lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (!episode.subtitles)
      return [];
    return episode.subtitles;
  }

  async deleteTVEpisodeSubtitle(id: string, episodeId: string, subtitleId: string) {
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { subtitles: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      await this.deleteMediaSubtitle(subtitleId, session);
      episode.subtitles.pull(subtitleId);
      await episode.save({ session });
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
    const slugFilename = slugify(filename, { lower: true, remove: /[^0-9a-zA-Z.\-_\s]/g });
    const driveSession = new this.driveSessionModel();
    driveSession._id = await createSnowFlakeIdAsync();
    driveSession.filename = slugFilename;
    driveSession.size = size;
    driveSession.mimeType = mimeType;
    driveSession.user = <any>authUser._id;
    const uploadSession = await this.googleDriveService.createUploadSession(slugFilename, driveSession._id);
    driveSession.storage = <any>uploadSession.storage;
    await driveSession.save();
    return { _id: driveSession._id, url: uploadSession.url };
  }

  async saveTVEpisodeSource(id: string, episodeId: string, sessionId: string, saveMediaSourceDto: SaveMediaSourceDto, authUser: AuthUserDto) {
    const media = await this.mediaModel.findOne({ _id: id, type: MediaType.TV }, { _id: 1, uploadStatus: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOne({ _id: episodeId, media: <any>id }, { _id: 1, source: 1, status: 1 }).exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    const uploadSession = await this.driveSessionModel.findOne({ _id: sessionId, user: <any>authUser._id })
      .populate('storage')
      .populate('user', { _id: 1, username: 1, email: 1, displayName: 1 })
      .select({ createdAt: 0, __v: 0 })
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
        quality: 0,
        codec: 0,
        mimeType: uploadSession.mimeType,
        size: uploadSession.size,
        media: episode._id,
        storage: uploadSession.storage._id
      });
      episode.source = uploadSession._id;
      episode.status = MediaSourceStatus.PROCESSING;
      media.uploadStatus = MediaStatus.PROCESSING;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(uploadSession.storage._id, uploadSession._id, uploadSession.size, session),
        this.driveSessionModel.deleteOne({ _id: sessionId }, { session }),
        mediaSource.save({ session }),
        episode.save({ session }),
        media.save({ session })
      ]);
      // Create transcode queue
      uploadSession.depopulate('storage');
      const defaultStreamCodecs = await this.settingsService.findDefaultStreamCodecs();
      const jobs = [];
      const streamCodecKeys = Object.keys(StreamCodec);
      for (let i = 0; i < streamCodecKeys.length; i++) {
        if (defaultStreamCodecs & StreamCodec[streamCodecKeys[i]]) {
          jobs.push({
            name: StreamCodec[streamCodecKeys[i]].toString(),
            data: {
              ...uploadSession.toObject(), media: media._id, episode: episode._id, driveId: fileInfo.driveId,
              teamDriveId: fileInfo.teamDriveId
            }
          });
        }
      }
      await this.videoTranscodeQueue.addBulk(jobs);
    });
  }

  async deleteTVEpisodeSource(id: string, episodeId: string) {
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
      await episode.save({ session });
    });
  }

  async addTVEpisodeStream(addMediaStreamDto: AddMediaStreamDto) {
    const media = await this.mediaModel.findOne({ _id: addMediaStreamDto.media, type: MediaType.TV }, { _id: 1, uploadStatus: 1 })
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
        type: MediaStorageType.SOURCE,
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
      media.uploadStatus = MediaStatus.DONE;
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
    await this.httpEmailService.sendEmailMailgun(infoData.user.email, infoData.user.username, 'Your TV Show episode is ready',
      MailgunTemplate.MEDIA_PROCESSING_SUCCESS, {
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
      await this.httpEmailService.sendEmailMailgun(errData.user.email, errData.user.username, 'TV Show episode processing failed',
        MailgunTemplate.MEDIA_PROCESSING_FAILURE, {
        recipient_name: errData.user.username
      });
    });
  }

  async findAllTVEpisodeStreams(id: string, episodeNumber: number) {
    const media = await this.mediaModel.findOneAndUpdate(
      { _id: id, type: MediaType.TV },
      { $inc: { views: 1, dailyViews: 1, weeklyViews: 1, monthlyViews: 1, yearlyViews: 1 } }
    ).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.uploadStatus !== MediaStatus.DONE)
      throw new HttpException({ code: StatusCode.TV_NOT_READY, message: 'TV Show is not ready' }, HttpStatus.NOT_FOUND);
    const episode = await this.tvEpisodeModel.findOneAndUpdate(
      { media: id, episodeNumber: episodeNumber },
      { $inc: { views: 1 } }
    ).populate([
      { path: 'streams', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } },
      { path: 'subtitles' }
    ]).lean().exec();
    if (!episode)
      throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
    if (!episode.streams?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
    return plainToClass(MediaStream, episode);
  }

  async updateMediaRating(id: string, incCount: number, incScore: number, session?: ClientSession) {
    const media = await this.mediaModel.findOne({ _id: id, uploadStatus: MediaStatus.DONE }, undefined, { session });
    if (!media) return;
    media.ratingCount += incCount;
    media.ratingScore += incScore;
    media.ratingAverage = +((media.ratingScore / media.ratingCount).toFixed(1));
    await media.save({ session });
    return media.toObject();
  }

  findAvailableMedia(id: string, session?: ClientSession) {
    return this.mediaModel.findOne({ _id: id, uploadStatus: MediaStatus.DONE }, {}, { session }).lean();
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

  private async deleteMediaSubtitle(id: string, session: ClientSession) {
    if (!id)
      return;
    const subtitle = await this.mediaStorageModel.findByIdAndDelete(id, { session }).populate('storage').lean();
    if (subtitle) {
      await this.externalStoragesService.deleteFileFromStorage(subtitle.storage._id, id, subtitle.size, session);
      this.dropboxService.deleteSubtitleFolder(id, subtitle.storage, 5);
    }
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
