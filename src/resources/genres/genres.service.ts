import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToInstance, plainToClassFromExist } from 'class-transformer';
import { ClientSession, Connection, LeanDocument, Model } from 'mongoose';
import pLimit from 'p-limit';

import { Genre, GenreDocument } from '../../schemas';
import { CreateGenreDto, FindGenresDto, UpdateGenreDto, PaginateGenresDto, RemoveGenresDto } from './dto';
import { Genre as GenreEntity, GenreDetails } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users';
import { Paginated } from '../../common/entities';
import { AuditLogBuilder, convertToLanguage, convertToLanguageArray, convertToMongooseSort, createSnowFlakeId, escapeRegExp, MongooseOffsetPagination } from '../../utils';
import { AuditLogType, MongooseConnection, StatusCode } from '../../enums';
import { GENRE_LIMIT, I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name, MongooseConnection.DATABASE_A) private genreModel: Model<GenreDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async create(createGenreDto: CreateGenreDto, authUser: AuthUserDto) {
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
    return genre.toObject();
  }

  async findAll(paginateGenresDto: PaginateGenresDto, acceptLanguage: string, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { page, limit, sort, search } = paginateGenresDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.genreModel.aggregate(aggregation.build()).exec();
    let genreList = new Paginated<GenreEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<GenreEntity>(acceptLanguage, data.results, {
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

  async findAllGenres(findGenresDto: FindGenresDto, acceptLanguage: string, authUser: AuthUserDto) {
    const { sort } = findGenresDto;
    let sortQuery: any = {};
    sort != undefined && (sortQuery = convertToMongooseSort(sort, ['_id', 'name']));
    const genres = await this.genreModel.find({}, { _id: 1, name: 1, _translations: 1 }, { sort: sortQuery }).lean().exec();
    const translated = convertToLanguageArray<LeanDocument<GenreDocument>>(acceptLanguage, genres, {
      keepTranslationsObject: authUser.hasPermission
    });
    return translated;
  }

  async findOne(id: string, acceptLanguage: string, authUser: AuthUserDto) {
    const genre = await this.genreModel.findById(id, { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<GenreDocument>>(acceptLanguage, genre, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(GenreDetails, translated);
  }

  async update(id: string, updateGenreDto: UpdateGenreDto, authUser: AuthUserDto) {
    if (!Object.keys(updateGenreDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, translate } = updateGenreDto;
    const genre = await this.genreModel.findById(id).exec();
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
    const translated = convertToLanguage<LeanDocument<GenreDocument>>(translate, genre.toObject(), {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(GenreDetails, translated);
  }

  async remove(id: string, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedGenre = await this.genreModel.findByIdAndDelete(id).lean().exec()
      if (!deletedGenre)
        throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteGenreMedia(id, <any[]>deletedGenre.media, session),
        this.auditLogService.createLog(authUser._id, deletedGenre._id, Genre.name, AuditLogType.GENRE_DELETE)
      ]);
    });
  }

  async removeMany(removeGenresDto: RemoveGenresDto, authUser: AuthUserDto) {
    const ids = !Array.isArray(removeGenresDto.ids) ? [removeGenresDto.ids] : removeGenresDto.ids;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Find all genres and delete
      const genres = await this.genreModel.find({ _id: { $in: ids } }).lean().session(session);
      const deleteGenreIds = genres.map(g => g._id);
      await Promise.all([
        this.genreModel.deleteMany({ _id: { $in: deleteGenreIds } }, { session }),
        this.auditLogService.createManyLogs(authUser._id, deleteGenreIds, Genre.name, AuditLogType.GENRE_DELETE)
      ]);
      // Pull genres from media
      const deleteGenreMediaLimit = pLimit(5);
      await Promise.all(genres.map(genre => deleteGenreMediaLimit(() =>
        this.mediaService.deleteGenreMedia(genre.id, <string[]><unknown>genre.media, session))));
    });
  }

  findByName(name: string, language: string) {
    let filters: { [key: string]: any } = { name };
    if (language && language !== I18N_DEFAULT_LANGUAGE) {
      const languageKey = `_translations.${language}.name`;
      filters = { [languageKey]: name };
    }
    return this.genreModel.findOne(filters).lean().exec();
  }

  async createMany(genres: { name: string }[], session?: ClientSession) {
    const createdGenres: LeanDocument<GenreDocument>[] = [];
    for (let i = 0; i < genres.length; i++) {
      const genreId = await createSnowFlakeId();
      const genre = await this.genreModel.findOneAndUpdate(genres[i], { $setOnInsert: { _id: genreId } },
        { new: true, upsert: true, session }
      ).lean().exec();
      createdGenres.push(genre);
    }
    return createdGenres;
  }

  countByIds(ids: string[]) {
    return this.genreModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  addMediaGenres(mediaId: string, genreIds: string[], session?: ClientSession) {
    if (genreIds.length)
      return this.genreModel.updateMany({ _id: { $in: genreIds } }, { $push: { media: <any>mediaId } }, { session });
  }

  deleteMediaGenres(mediaId: string, genreIds: string[], session?: ClientSession) {
    if (genreIds.length)
      return this.genreModel.updateMany({ _id: { $in: genreIds } }, { $pull: { media: <any>mediaId } }, { session });
  }
}
