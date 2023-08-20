import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToInstance, plainToClassFromExist, instanceToPlain } from 'class-transformer';
import { ClientSession, Connection, FilterQuery, Model } from 'mongoose';
import pLimit from 'p-limit';

import { Genre, GenreDocument } from '../../schemas';
import { CreateGenreDto, FindGenresDto, UpdateGenreDto, PaginateGenresDto, RemoveGenresDto, CursorPageGenresDto, CursorPageMediaDto } from './dto';
import { Genre as GenreEntity, GenreDetails } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { Media as MediaEntity } from '../media';
import { AuthUserDto } from '../users';
import { WsAdminGateway } from '../ws-admin';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { AuditLogBuilder, convertToLanguage, convertToLanguageArray, convertToMongooseSort, createSnowFlakeId, escapeRegExp, LookupOptions, MongooseCursorPagination, MongooseOffsetPagination } from '../../utils';
import { AuditLogType, MediaVisibility, MongooseConnection, SocketMessage, SocketRoom, StatusCode } from '../../enums';
import { GENRE_LIMIT, I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name, MongooseConnection.DATABASE_A) private genreModel: Model<GenreDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService,
    private wsAdminGateway: WsAdminGateway) { }

  async create(createGenreDto: CreateGenreDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { name } = createGenreDto;
    const totalGenres = await this.genreModel.estimatedDocumentCount().exec();
    if (totalGenres >= GENRE_LIMIT)
      throw new HttpException({ code: StatusCode.GENRE_LIMIT_REACHED, message: 'Genre limit has beed reached' }, HttpStatus.BAD_REQUEST);
    const checkGenre = await this.genreModel.findOne({ name }).lean().exec();
    if (checkGenre)
      throw new HttpException({ code: StatusCode.GENRE_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
    const genre = new this.genreModel();
    genre._id = await createSnowFlakeId();
    genre.name = name;
    const auditLog = new AuditLogBuilder(authUser._id, genre._id, Genre.name, AuditLogType.GENRE_CREATE);
    auditLog.appendChange('name', genre.name);
    await Promise.all([
      genre.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(SocketRoom.ADMIN_GENRE_LIST).emit(SocketMessage.REFRESH_GENRES);
    return genre.toObject();
  }

  async findAll(paginateGenresDto: PaginateGenresDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { page, limit, sort, search } = paginateGenresDto;
    const filters = search ? { name: { $regex: `^${escapeRegExp(search)}`, $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.genreModel.aggregate(aggregation.build()).exec();
    let genreList = new Paginated<GenreEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<GenreEntity>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      genreList = plainToClassFromExist(new Paginated<GenreEntity>({ type: GenreEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return genreList;
  }

  async findAllCursor(cursorPageGenresDto: CursorPageGenresDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { pageToken, limit, search, sort } = cursorPageGenresDto;
    const filters = search ? { name: { $regex: `^${escapeRegExp(search)}`, $options: 'i' } } : {};
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, filters });
    const [data] = await this.genreModel.aggregate(aggregation.build()).exec();
    let genreList = new CursorPaginated<GenreEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<GenreEntity>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      genreList = plainToClassFromExist(new CursorPaginated<GenreEntity>({ type: GenreEntity }), {
        totalResults: data.totalResults,
        results: translatedResults,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    }
    return genreList;
  }

  async findAllNoPage(findGenresDto: FindGenresDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { ids, sort } = findGenresDto;
    let filters: FilterQuery<GenreDocument> = {};
    ids != undefined && (filters._id = { $in: ids });
    let sortQuery: any = {};
    sort != undefined && (sortQuery = convertToMongooseSort(sort, ['_id', 'name']));
    const genres = await this.genreModel.find(filters, { _id: 1, name: 1, _translations: 1 }, { sort: sortQuery }).lean().exec();
    const translated = convertToLanguageArray<Genre>(headers.acceptLanguage, genres, {
      keepTranslationsObject: authUser.hasPermission
    });
    return translated;
  }

  async findOne(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const genre = await this.genreModel.findOne({ _id: id }, { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<Genre>(headers.acceptLanguage, genre, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(GenreDetails, translated);
  }

  async update(id: bigint, updateGenreDto: UpdateGenreDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateGenreDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, translate } = updateGenreDto;
    const genre = await this.genreModel.findOne({ _id: id }).exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, genre._id, Genre.name, AuditLogType.GENRE_UPDATE);
    if (translate && translate !== I18N_DEFAULT_LANGUAGE && name) {
      const nameKey = `_translations.${translate}.name`;
      const oldName = genre.get(nameKey);
      if (oldName !== name) {
        const checkGenre = await this.genreModel.findOne({ [nameKey]: name }).lean().exec();
        if (checkGenre)
          throw new HttpException({ code: StatusCode.GENRE_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
        auditLog.appendChange(nameKey, name, oldName);
        genre.set(nameKey, name);
      }
    }
    else {
      if (name && genre.name !== name) {
        const checkGenre = await this.genreModel.findOne({ name }).lean().exec();
        if (checkGenre)
          throw new HttpException({ code: StatusCode.GENRE_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
        auditLog.appendChange('name', name, genre.name);
        genre.name = name;
      }
    }
    await Promise.all([
      genre.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const translated = convertToLanguage<Genre>(translate, genre.toObject(), {
      keepTranslationsObject: authUser.hasPermission
    });
    const serializedGenre = instanceToPlain(plainToInstance(GenreDetails, translated));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_GENRE_LIST, `${SocketRoom.ADMIN_GENRE_DETAILS}:${translated._id}`])
      .emit(SocketMessage.REFRESH_GENRES, {
        genreId: translated._id,
        genre: serializedGenre
      });
    return serializedGenre;
  }

  async remove(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedGenre: Genre;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedGenre = await this.genreModel.findOneAndDelete({ _id: id }, { session }).lean()
      if (!deletedGenre)
        throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteGenreMedia(id, <bigint[]><unknown>deletedGenre.media, session),
        this.auditLogService.createLog(authUser._id, deletedGenre._id, Genre.name, AuditLogType.GENRE_DELETE)
      ]);
    }).finally(() => session.endSession().catch(() => { }));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_GENRE_LIST, `${SocketRoom.ADMIN_GENRE_DETAILS}:${deletedGenre._id}`])
      .emit(SocketMessage.REFRESH_GENRES, {
        genreId: deletedGenre._id,
        deleted: true
      });
  }

  async removeMany(removeGenresDto: RemoveGenresDto, headers: HeadersDto, authUser: AuthUserDto) {
    let deleteGenreIds: bigint[];
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Find all genres and delete
      const genres = await this.genreModel.find({ _id: { $in: removeGenresDto.ids } }).lean().session(session);
      deleteGenreIds = genres.map(g => g._id);
      await Promise.all([
        this.genreModel.deleteMany({ _id: { $in: deleteGenreIds } }, { session }),
        this.auditLogService.createManyLogs(authUser._id, deleteGenreIds, Genre.name, AuditLogType.GENRE_DELETE)
      ]);
      // Pull genres from media
      const deleteGenreMediaLimit = pLimit(5);
      await Promise.all(genres.map(genre => deleteGenreMediaLimit(() =>
        this.mediaService.deleteGenreMedia(genre.id, <bigint[]><unknown>genre.media, session))));
    }).finally(() => session.endSession().catch(() => { }));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    const genreDetailsRooms = deleteGenreIds.map(id => `${SocketRoom.ADMIN_GENRE_DETAILS}:${id}`);
    ioEmitter.to([SocketRoom.ADMIN_GENRE_LIST, ...genreDetailsRooms])
      .emit(SocketMessage.REFRESH_GENRES, {
        genreIds: deleteGenreIds,
        deleted: true
      });
  }

  async findAllMedia(id: bigint, cursorPageMediaDto: CursorPageMediaDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id'];
    const fields = {
      _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
      poster: 1, backdrop: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
      createdAt: 1, updatedAt: 1
    };
    const { pageToken, limit, sort } = cursorPageMediaDto;
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum });
    const lookupOptions: LookupOptions = {
      from: 'media', localField: 'media', foreignField: '_id', as: 'media', isArray: true,
      pipeline: [{ $match: { visibility: MediaVisibility.PUBLIC } }],
      children: [{
        from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
        pipeline: [{ $project: { _id: 1, name: 1, _translations: 1 } }]
      }]
    };
    const [data] = await this.genreModel.aggregate(aggregation.buildLookupOnly(id, lookupOptions)).exec();
    let mediaList = new CursorPaginated<MediaEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<MediaEntity>(headers.acceptLanguage, data.results, {
        populate: ['genres'],
        keepTranslationsObject: authUser.hasPermission
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

  findByName(name: string, language: string) {
    let filters: { [key: string]: any } = { name };
    if (language && language !== I18N_DEFAULT_LANGUAGE) {
      const languageKey = `_translations.${language}.name`;
      filters = { [languageKey]: name };
    }
    return this.genreModel.findOne(filters).lean().exec();
  }

  async createMany(genres: { name: string }[], creatorId: bigint, session?: ClientSession) {
    const createdGenres: Genre[] = [];
    const newGenreIds: bigint[] = [];
    for (let i = 0; i < genres.length; i++) {
      const createGenreRes = await <any>this.genreModel.findOneAndUpdate(genres[i], { $setOnInsert: { _id: await createSnowFlakeId() } },
        { new: true, upsert: true, lean: true, rawResult: true, session }
      );
      if (!createGenreRes.lastErrorObject?.updatedExisting)
        newGenreIds.push(createGenreRes.value._id);
      createdGenres.push(createGenreRes.value);
    }
    await this.auditLogService.createManyLogs(creatorId, newGenreIds, Genre.name, AuditLogType.GENRE_CREATE);
    return createdGenres;
  }

  countByIds(ids: bigint[]) {
    return this.genreModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  addMediaGenres(mediaId: bigint, genreIds: bigint[], session?: ClientSession) {
    if (genreIds.length)
      return this.genreModel.updateMany({ _id: { $in: genreIds } }, { $push: { media: mediaId } }, { session });
  }

  deleteMediaGenres(mediaId: bigint, genreIds: bigint[], session?: ClientSession) {
    if (genreIds.length)
      return this.genreModel.updateMany({ _id: { $in: genreIds } }, { $pull: { media: mediaId } }, { session });
  }

  updateMediaGenres(mediaId: bigint, newIds: bigint[], oldIds: bigint[], session?: ClientSession) {
    const writes: Parameters<typeof this.genreModel.bulkWrite>[0] = [];
    if (newIds.length)
      writes.push({ updateMany: { filter: { _id: { $in: <any>newIds } }, update: { $push: { media: mediaId } } } });
    if (oldIds.length)
      writes.push({ updateMany: { filter: { _id: { $in: <any>oldIds } }, update: { $pull: { media: mediaId } } } });
    return this.genreModel.bulkWrite(writes, { session });
  }
}
