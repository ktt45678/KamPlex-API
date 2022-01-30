import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToInstance, plainToClassFromExist } from 'class-transformer';
import { ClientSession, Connection, LeanDocument, Model } from 'mongoose';

import { Genre, GenreDocument } from '../../schemas/genre.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { CreateGenreDto } from './dto/create-genre.dto';
import { FindGenresDto } from './dto/find-genres.dto';
import { PaginateGenresDto } from './dto/paginate-genres.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { Paginated } from '../roles/entities/paginated.entity';
import { GenreDetails } from './entities/genre-details.entity';
import { Genre as GenreEntity } from './entities/genre.entity';
import {
  convertToLanguage, convertToLanguageArray, convertToMongooseSort, createSnowFlakeIdAsync, escapeRegExp, MongooseAggregation
} from '../../utils';
import { AuditLogType, MongooseConnection, StatusCode } from '../../enums';
import { GENRE_LIMIT, I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name) private genreModel: Model<GenreDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async create(createGenreDto: CreateGenreDto, authUser: AuthUserDto) {
    const { name } = createGenreDto;
    const totalGenres = await this.genreModel.estimatedDocumentCount().exec();
    if (totalGenres >= GENRE_LIMIT)
      throw new HttpException({ code: StatusCode.GENRE_LIMIT_REACHED, message: 'Genre limit has beed reached' }, HttpStatus.BAD_REQUEST);
    const genre = new this.genreModel();
    genre._id = await createSnowFlakeIdAsync();
    genre.name = name;
    await Promise.all([
      genre.save(),
      this.auditLogService.createLog(authUser._id, genre._id, Genre.name, AuditLogType.GENRE_CREATE)
    ]);
    return genre.toObject();
  }

  async findAll(paginateGenresDto: PaginateGenresDto, acceptLanguage: string) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { page, limit, sort, search } = paginateGenresDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.genreModel.aggregate(aggregation.build()).exec();
    let genreList = new Paginated<GenreEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<GenreEntity>(acceptLanguage, data.results);
      genreList = plainToClassFromExist(new Paginated<GenreEntity>({ type: GenreEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return genreList;
  }

  async findAllGenres(findGenresDto: FindGenresDto, acceptLanguage: string) {
    const { sort } = findGenresDto;
    let sortQuery: any = {};
    sort != undefined && (sortQuery = convertToMongooseSort(sort, ['_id', 'name']));
    const genres = await this.genreModel.find({}, { _id: 1, name: 1, _translations: 1 }, { sort: sortQuery }).lean().exec();
    const translated = convertToLanguageArray<LeanDocument<GenreDocument>>(acceptLanguage, genres);
    return translated;
  }

  async findOne(id: string, acceptLanguage: string) {
    const genre = await this.genreModel.findById(id, { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<GenreDocument>>(acceptLanguage, genre);
    return plainToInstance(GenreDetails, translated);
  }

  async update(id: string, updateGenreDto: UpdateGenreDto, authUser: AuthUserDto) {
    if (!Object.keys(updateGenreDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name } = updateGenreDto;
    const genre = await this.genreModel.findById(id).exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    if (name != undefined) {
      if (updateGenreDto.translate && updateGenreDto.translate !== I18N_DEFAULT_LANGUAGE)
        genre.set(`_translations.${updateGenreDto.translate}.name`, name);
      else genre.name = name;
    }
    await Promise.all([
      genre.save(),
      this.auditLogService.createLog(authUser._id, genre._id, Genre.name, AuditLogType.GENRE_UPDATE)
    ]);
    const translated = convertToLanguage<LeanDocument<GenreDocument>>(updateGenreDto.translate, genre.toObject());
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

  findByName(name: string, language: string) {
    let filters: any = { name };
    if (language && language !== I18N_DEFAULT_LANGUAGE) {
      const languageKey = `_translations.${language}.name`;
      filters = { [languageKey]: name };
    }
    return this.genreModel.findOne(filters).lean().exec();
  }

  countByIds(ids: string[]) {
    return this.genreModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  addMediaGenres(mediaId: string, genreIds: string[], session?: ClientSession) {
    if (genreIds.length)
      return this.genreModel.updateMany({ _id: { $in: genreIds } }, { $push: { media: mediaId } }, { session });
  }

  deleteMediaGenres(mediaId: string, genreIds: string[], session?: ClientSession) {
    if (genreIds.length)
      return this.genreModel.updateMany({ _id: { $in: genreIds } }, { $pull: { media: mediaId } }, { session });
  }
}
