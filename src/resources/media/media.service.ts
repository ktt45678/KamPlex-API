import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, LeanDocument, Model } from 'mongoose';
import { plainToClass, plainToClassFromExist } from 'class-transformer';
import ISO6391 from 'iso-639-1';
import slugify from 'slugify';

import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { AddMediaVideoDto } from './dto/add-media-video.dto';
import { PaginateMediaDto } from './dto/paginate-media.dto';
import { FindMediaDto } from './dto/find-media.dto';
import { Media, MediaDocument } from '../../schemas/media.schema';
import { MediaStorage, MediaStorageDocument } from '../../schemas/media-storage.schema';
import { Movie } from '../../schemas/movie.schema';
import { TVShow } from '../../schemas/tv-show.schema';
import { MediaVideo } from '../../schemas/media-video.schema';
import { GenresService } from '../genres/genres.service';
import { ProducersService } from '../producers/producers.service';
import { ImgurService } from '../../common/imgur/imgur.service';
import { DropboxService } from '../../common/dropbox/dropbox.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { MediaType } from '../../enums/media-type.enum';
import { MediaVideoSite } from '../../enums/media-video-site.enum';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { Paginated } from '../roles/entities/paginated.entity';
import { Media as MediaEntity } from './entities/media.entity';
import { MediaDetails } from './entities/media-details.entity';
import { convertToLanguage, convertToLanguageArray } from '../../utils/i18n-transform.util';
import { I18N_DEFAULT_LANGUAGE } from '../../config';
import { MediaStorageType } from '../../enums/media-storage-type.enum';

@Injectable()
export class MediaService {
  constructor(@InjectModel(Media.name) private mediaModel: Model<MediaDocument>, @InjectModel(MediaStorage.name) private mediaStorageModel: Model<MediaStorageDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection, @Inject(forwardRef(() => GenresService)) private genresService: GenresService,
    @Inject(forwardRef(() => ProducersService)) private producersService: ProducersService, private externalStoragesService: ExternalStoragesService,
    private googleDriveService: GoogleDriveService, private imgurService: ImgurService) { }

  async create(createMediaDto: CreateMediaDto, authUser: AuthUserDto) {
    const { type, title, originalTitle, overview, originalLanguage, runtime, adult, releaseDate } = createMediaDto;
    const slug = slugify(`${title} ${originalTitle}`, { lower: true });
    const media = new this.mediaModel({
      type, title, originalTitle, slug, overview, originalLanguage, runtime, adult,
      releaseDate, submitted: true, verified: true, addedBy: authUser._id
    });
    if (createMediaDto.type === MediaType.MOVIE)
      media.movie = new Movie();
    else if (createMediaDto.type === MediaType.TV)
      media.tvShow = new TVShow();
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

  async findAll(paginateMediaDto: PaginateMediaDto) {
    const sortEnum = ['_id', 'title', 'originalLanguage', 'releaseDate', 'createdAt', 'updatedAt'];
    const fields = {
      _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
      releaseDate: 1, adult: 1, _translations: 1, createdAt: 1, updatedAt: 1
    };
    const { page, limit, sort, search, language, type, originalLanguage, year, adult, genres } = paginateMediaDto;
    const filters: any = {};
    type !== undefined && (filters.type = type);
    originalLanguage !== undefined && (filters.originalLanguage = originalLanguage);
    year !== undefined && (filters.releaseDate = {
      $gte: new Date(`${year}-01-01T00:00:00.000+00:00`),
      $lt: new Date(`${year + 1}-01-01T00:00:00.000+00:00`)
    });
    adult !== undefined && (filters.adult = adult);
    if (Array.isArray(genres)) filters.genres = { $in: genres };
    else if (genres !== undefined) filters.genres = genres;
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
      const translatedResults = convertToLanguageArray<MediaEntity>(language, data.results, ['genres']);
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
        producers: 1, credits: 1, runtime: 1, movie: 1, tvShow: 1, videos: 1, adult: 1, releaseDate: 1, addedBy: 1, _translations: 1,
        createdAt: 1, updatedAt: 1
      }).populate('genres', { _id: 1, name: 1, _translations: 1 })
        .populate('producers', { _id: 1, name: 1 })
        .populate('poster')
        .populate('backdrop')
        .populate('addedBy', { _id: 1, username: 1, displayName: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 })
        .lean().exec();
    else
      media = await this.mediaModel.findById(id, {
        _id: 1, type: 1, title: 1, originalTitle: 1, slug: 1, overview: 1, poster: 1, backdrop: 1, genres: 1, originalLanguage: 1,
        producers: 1, credits: 1, runtime: 1, movie: 1, tvShow: 1, videos: 1, adult: 1, releaseDate: 1, _translations: 1,
        createdAt: 1, updatedAt: 1
      }).populate('genres', { _id: 1, name: 1, _translations: 1 })
        .populate('producers', { _id: 1, name: 1 })
        .populate('poster')
        .populate('backdrop')
        .lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<Media>>(findMediaDto.language, media, ['genres']);
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
          const slug = media.slug = slugify(`${updateMediaDto.title} ${updateMediaDto.originalTitle}`, { lower: true });
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
    const translated = convertToLanguage<LeanDocument<Media>>(language, media.toObject(), ['genres']);
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
    const media = await this.mediaModel.findByIdAndUpdate(id, { $addToSet: { videos: video } }, { new: true }).lean().exec();
    if (!media)
      throw new HttpException({ code: StatusCode.MEDIA_NOT_FOUND, message: 'Media not found' }, HttpStatus.NOT_FOUND);
    return media;
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
      poster.media = <any>id;
      poster.storage = <any>image.storage;
      media.poster = poster._id;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>image.storage, poster._id, session),
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
      backdrop.media = <any>id;
      backdrop.storage = <any>image.storage;
      media.backdrop = backdrop._id;
      await Promise.all([
        this.externalStoragesService.addFileToStorage(<any>image.storage, backdrop._id, session),
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

  async deleteMediaImage(id: string, session: ClientSession) {
    if (!id)
      return;
    const oldBackdrop = await this.mediaStorageModel.findByIdAndDelete(id, { session }).lean();
    return Promise.all([
      this.externalStoragesService.deleteFileFromStorage(<any>oldBackdrop.storage, id, session),
      this.imgurService.getStorageAndDeleteImage(oldBackdrop.path, <any>oldBackdrop.storage)
    ]);
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
