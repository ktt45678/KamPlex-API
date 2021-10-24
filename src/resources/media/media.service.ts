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
import { FindMediaDto } from './dto/find-media.dto';
import { AddMediaSourceDto } from './dto/add-media-source.dto';
import { AddMediaStreamDto } from './dto/add-media-stream.dto';
import { MediaQueueStatusDto } from './dto/media-queue-status.dto';
import { SaveMediaSourceDto } from './dto/save-media-source.dto';
import { Media, MediaDocument } from '../../schemas/media.schema';
import { MediaStorage, MediaStorageDocument } from '../../schemas/media-storage.schema';
import { DriveSession, DriveSessionDocument } from '../../schemas/drive-session.schema';
import { Movie } from '../../schemas/movie.schema';
import { TVShow } from '../../schemas/tv-show.schema';
import { MediaVideo } from '../../schemas/media-video.schema';
import { GenresService } from '../genres/genres.service';
import { ProducersService } from '../producers/producers.service';
import { SettingsService } from '../settings/settings.service';
import { HistoryService } from '../history/history.service';
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
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { convertToLanguage, convertToLanguageArray } from '../../utils/i18n-transform.util';
import { readFirstLine } from '../../utils/subtitle.util';
import { DROPBOX_DIRECT_URL, I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name) private mediaModel: Model<MediaDocument>, @InjectModel(MediaStorage.name) private mediaStorageModel: Model<MediaStorageDocument>,
    @InjectModel(DriveSession.name) private driveSessionModel: Model<DriveSessionDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @InjectQueue(TaskQueue.VIDEO_TRANSCODE) private videoTranscodeQueue: Queue, @Inject(forwardRef(() => GenresService)) private genresService: GenresService,
    @Inject(forwardRef(() => ProducersService)) private producersService: ProducersService, private externalStoragesService: ExternalStoragesService,
    private settingsService: SettingsService, private historyService: HistoryService, private httpEmailService: HttpEmailService,
    private googleDriveService: GoogleDriveService, private imgurService: ImgurService, private dropboxService: DropboxService,
    private configService: ConfigService) { }

  async create(createMediaDto: CreateMediaDto, authUser: AuthUserDto) {
    const { type, title, originalTitle, overview, originalLanguage, runtime, adult, releaseDate } = createMediaDto;
    const slug = (originalTitle?.toLowerCase() === title.toLowerCase()) ?
      slugify(title, { lower: true }) :
      slugify(`${title} ${originalTitle}`, { lower: true });
    const media = new this.mediaModel({
      type, title, originalTitle, slug, overview, originalLanguage, runtime, adult,
      releaseDate, status: MediaStatus.PROCESSING, addedBy: authUser._id
    });
    if (createMediaDto.type === MediaType.MOVIE) {
      media.movie = new Movie();
      media.movie.status = MediaSourceStatus.PENDING;
    }
    else if (createMediaDto.type === MediaType.TV) {
      media.tvShow = new TVShow();
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

  async findAll(paginateMediaDto: PaginateMediaDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'title', 'originalLanguage', 'releaseDate', 'views', 'likes', 'updatedAt'];
    const fields = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
      adult: 1, releaseDate: 1, views: 1, likes: 1, dislikes: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const { page, limit, sort, search, language, type, originalLanguage, year, genres } = paginateMediaDto;
    const filters: any = {};
    type !== undefined && (filters.type = type);
    originalLanguage !== undefined && (filters.originalLanguage = originalLanguage);
    year !== undefined && (filters.releaseDate = {
      $gte: new Date(`${year}-01-01T00:00:00.000+00:00`),
      $lt: new Date(`${year + 1}-01-01T00:00:00.000+00:00`)
    });
    if (Array.isArray(genres))
      filters.genres = { $in: genres };
    else if (genres !== undefined)
      filters.genres = genres;
    !authUser.hasPermission && (filters.status = MediaStatus.DONE);
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
    const [data]: [Paginated<MediaEntity>] = await this.mediaModel.aggregate(pipeline).exec();
    let mediaList = new Paginated<MediaEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<MediaEntity>(language, data.results, { populate: ['genres'] });
      mediaList = plainToClassFromExist(new Paginated<MediaEntity>({ type: MediaEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return mediaList;
  }

  async findOne(id: string, findMediaDto: FindMediaDto, authUser: AuthUserDto) {
    let media: LeanDocument<Media>;
    if (authUser.hasPermission)
      media = await this.mediaModel.findById(id, {
        _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
        producers: 1, credits: 1, runtime: 1, movie: 1, tvShow: 1, videos: 1, adult: 1, releaseDate: 1, views: 1, likes: 1, dislikes: 1,
        status: 1, addedBy: 1, _translations: 1, createdAt: 1, updatedAt: 1
      }).populate('genres', { _id: 1, name: 1, _translations: 1 })
        .populate('producers', { _id: 1, name: 1 })
        .populate('poster')
        .populate('backdrop')
        .populate('addedBy', { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 })
        .lean().exec();
    else
      media = await this.mediaModel.findById(id, {
        _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
        producers: 1, credits: 1, runtime: 1, movie: 1, tvShow: 1, videos: 1, adult: 1, releaseDate: 1, views: 1, likes: 1, dislikes: 1,
        _translations: 1, createdAt: 1, updatedAt: 1
      }).populate('genres', { _id: 1, name: 1, _translations: 1 })
        .populate('producers', { _id: 1, name: 1 })
        .populate('poster')
        .populate('backdrop')
        .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<Media>>(findMediaDto.language, media, { populate: ['genres'] });
    return plainToClass(MediaDetails, translated);
  }

  async update(id: string, updateMediaDto: UpdateMediaDto) {
    if (!Object.keys(updateMediaDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const media = await this.mediaModel.findById(id).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const { language } = updateMediaDto;
    if (language && language !== I18N_DEFAULT_LANGUAGE) {
      updateMediaDto.title != undefined && media.set(`_translations.${language}.title`, updateMediaDto.title);
      updateMediaDto.overview != undefined && media.set(`_translations.${language}.overview`, updateMediaDto.overview);
      const slug = slugify(updateMediaDto.title, { lower: true });
      media.set(`_translations.${language}.slug`, slug || null);
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
    await media
      .populate({ path: 'genres', select: { _id: 1, name: 1, _translations: 1 } })
      .populate({ path: 'producers', select: { _id: 1, name: 1 } })
      .execPopulate();
    const translated = convertToLanguage<LeanDocument<Media>>(language, media.toObject(), { populate: ['genres'] });
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
      }
    });
  }

  async addMediaVideo(id: string, addMediaVideoDto: AddMediaVideoDto) {
    // TODO: Create an audit log for added users
    const urlMatch = addMediaVideoDto.url.match(/.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/);
    if (!urlMatch || urlMatch[1].length !== 11)
      throw new HttpException({ code: StatusCode.INVALID_YOUTUBE_URL, message: 'Invalid YouTube Url' }, HttpStatus.BAD_REQUEST);
    const video = new MediaVideo();
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
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const image = await this.imgurService.uploadPoster(file.filepath, file.filename);
      if (media.poster)
        await this.deleteMediaImage(<any>media.poster, session);
      const poster = new this.mediaStorageModel();
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
    await media.populate('poster').execPopulate();
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
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const image = await this.imgurService.uploadBackdrop(file.filepath, file.filename);
      if (media.backdrop)
        await this.deleteMediaImage(<any>media.backdrop, session);
      const backdrop = new this.mediaStorageModel();
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
    await media.populate('backdrop').execPopulate();
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
    if (oldImage)
      return Promise.all([
        this.externalStoragesService.deleteFileFromStorage(oldImage.storage._id, id, oldImage.size, session),
        this.imgurService.deleteImage(oldImage.path, oldImage.storage)
      ]);
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
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const subtitle = new this.mediaStorageModel();
      const subtitleFile = await this.dropboxService.uploadSubtitle(file.filepath, `${subtitle._id}/${file.filename}`);
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
    const media = await this.mediaModel.findOne({ $and: [{ _id: id }, { type: MediaType.MOVIE }] }, { movie: 1 }).exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    if (media.movie.source)
      throw new HttpException({ code: StatusCode.MEDIA_SOURCE_EXIST, message: 'Source has already been added' }, HttpStatus.BAD_REQUEST);
    const { filename, size, mimeType } = addMediaSourceDto;
    const slugFilename = slugify(filename, { lower: true });
    const driveSession = new this.driveSessionModel();
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
    const media = await this.mediaModel.findOne({ $and: [{ _id: id }, { type: MediaType.MOVIE }] }, { _id: 1, movie: 1 }).exec();
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
      media.status = MediaStatus.PROCESSING;
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
    return sessionId;
  }

  async deleteMovieSource(id: string) {
    const media = await this.mediaModel.findOne({ $and: [{ _id: id }, { type: MediaType.MOVIE }] }, { _id: 1, movie: 1 }).exec();
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
      media.status = MediaStatus.DONE;
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
    if (media && media.movie?.source === <any>errData._id) {
      await Promise.all([
        this.deleteMediaSource(<any>media.movie.source),
        this.deleteMediaStreams(<any>media.movie.streams)
      ]);
      media.movie.source = undefined;
      media.movie.streams = undefined;
      media.movie.status = MediaSourceStatus.PENDING;
      media.status = MediaStatus.PENDING;
      await media.save();
    }
    await this.httpEmailService.sendEmailMailgun(errData.user.email, errData.user.username, 'Movie processing failed', MailgunTemplate.MEDIA_PROCESSING_FAILURE, {
      recipient_name: errData.user.username
    });
  }

  async findAllMovieStreams(id: string, authUser: AuthUserDto) {
    let media: LeanDocument<MediaDocument>;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      media = await this.mediaModel.findOneAndUpdate({ $and: [{ _id: id }, { type: MediaType.MOVIE }, { status: MediaStatus.DONE }] },
        { $inc: { views: 1 } }, { session })
        .select({ _id: 1, movie: 1 })
        .populate({ path: 'movie.streams', populate: { path: 'storage', select: { _id: 1, publicUrl: 1 } } })
        .populate('movie.subtitles')
        .lean();
      if (!media)
        throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
      if (!media.movie.streams.length)
        throw new HttpException({ code: StatusCode.MEDIA_STREAM_NOT_FOUND, message: 'Media stream not found' }, HttpStatus.NOT_FOUND);
      if (!authUser.isAnonymous)
        await this.historyService.updateHistoryMedia(authUser._id, id, session);
    });
    //return plainToClass(MediaStream, media.movie);
    const streams = { sources: [], subtitles: [] };
    for (let i = 0; i < media.movie.streams.length; i++) {
      streams.sources.push({
        src: `${media.movie.streams[i].storage.publicUrl}/~file?id=${media.movie.streams[i].path}`,
        type: media.movie.streams[i].mimeType,
        size: media.movie.streams[i].quality
      });
    }
    for (let i = 0; i < media.movie.subtitles.length; i++) {
      streams.subtitles.push({
        src: `${DROPBOX_DIRECT_URL}/${media.movie.subtitles[i].path}`,
        srclang: media.movie.subtitles[i].language,
        label: ISO6391.getName(media.movie.subtitles[i].language)
      });
    }
    return streams;
  }

  updateMediaRating(id: string, likes: number = 0, dislikes: number = 0, session?: ClientSession) {
    return this.mediaModel.findOneAndUpdate({ _id: id, status: MediaStatus.DONE }, { $inc: { likes, dislikes } }, { new: true, session }).lean();
  }

  findAvailableMedia(id: string, session?: ClientSession) {
    return this.mediaModel.findOne({ _id: id, status: MediaStatus.DONE }, {}, { session }).lean();
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
      return Promise.all([
        this.externalStoragesService.deleteFileFromStorage(subtitle.storage._id, id, subtitle.size, session),
        this.dropboxService.deleteSubtitleFolder(id, subtitle.storage)
      ]);
    }
  }

  private async deleteMediaSource(id: string, session?: ClientSession) {
    if (!id)
      return;
    const source = await this.mediaStorageModel.findByIdAndDelete(id, { session }).populate('storage').lean();
    if (source) {
      return Promise.all([
        this.externalStoragesService.deleteFileFromStorage(source.storage._id, id, source.size, session),
        this.googleDriveService.deleteFolder(id, source.storage)
      ]);
    }
  }

  private async deleteMediaStreams(ids: string[], session?: ClientSession) {
    if (!Array.isArray(ids))
      return;
    for (let i = 0; i < ids.length; i++) {
      const source = await this.mediaStorageModel.findByIdAndDelete(ids[i], { session }).lean();
      if (source) {
        await this.externalStoragesService.deleteFileFromStorage(<any>source.storage, ids[i], source.size, session);
      }
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
