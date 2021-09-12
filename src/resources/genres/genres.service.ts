import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Connection, LeanDocument } from 'mongoose';
import { plainToClass } from 'class-transformer';

import { Genre, GenreDocument } from '../../schemas/genre.schema';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { FindGenreDto } from './dto/find-genre.dto';
import { FindGenresDto } from './dto/find-genres.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { convertToLanguage, convertToLanguageArray } from '../../utils/i18n-transform.util';
import { convertToMongooseSort } from '../../utils/mongoose-helper.util';
import { GenreDetails } from './entities/genre-details.entity';
import { MediaService } from '../media/media.service';
import { GENRE_LIMIT, I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name) private genreModel: Model<GenreDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async create(createGenreDto: CreateGenreDto, authUser: AuthUserDto) {
    const { name } = createGenreDto;
    const totalGenres = await this.genreModel.estimatedDocumentCount().exec();
    if (Array.isArray(name)) {
      if (totalGenres + name.length > GENRE_LIMIT)
        throw new HttpException({ code: StatusCode.GENRE_LIMIT_REACHED, message: 'Genre limit has beed reached' }, HttpStatus.BAD_REQUEST);
      const results = [];
      for (let i = 0; i < name.length; i++) {
        const result = await this.genreModel.findOneAndUpdate({ name: name[i] }, {}, { upsert: true, new: true, setDefaultsOnInsert: true }).lean().exec();
        results.push(result);
      }
      return results;
    }
    if (totalGenres >= GENRE_LIMIT)
      throw new HttpException({ code: StatusCode.GENRE_LIMIT_REACHED, message: 'Genre limit has beed reached' }, HttpStatus.BAD_REQUEST);
    return this.genreModel.findOneAndUpdate({ name }, {}, { upsert: true, new: true, setDefaultsOnInsert: true }).lean().exec();
  }

  async findAll(findGenresDto: FindGenresDto) {
    const { search, sort, language } = findGenresDto;
    let filters: any = {};
    let sortQuery: any = {};
    if (search != undefined) {
      if (language && language !== I18N_DEFAULT_LANGUAGE) {
        // Search by original and translated languages
        const languageKey = `_translations.${language}.name`;
        filters.$or = [
          { [languageKey]: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }
      else {
        filters.name = { $regex: search, $options: 'i' };
      }
    }
    sort != undefined && (sortQuery = convertToMongooseSort(sort, ['_id', 'name']));
    const genres = await this.genreModel.find(filters, { _id: 1, name: 1, _translations: 1 }, { sort: sortQuery }).lean().exec();
    const translated = convertToLanguageArray<LeanDocument<GenreDocument>>(language, genres);
    return translated;
  }

  async findOne(id: string, findGenreDto: FindGenreDto) {
    const genre = await this.genreModel.findById(id, { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<GenreDocument>>(findGenreDto.language, genre);
    return plainToClass(GenreDetails, translated);
  }

  async update(id: string, updateGenreDto: UpdateGenreDto) {
    if (!Object.keys(updateGenreDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, language } = updateGenreDto;
    const genre = await this.genreModel.findById(id).exec();
    if (!genre)
      throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
    if (name != undefined) {
      if (language && language !== I18N_DEFAULT_LANGUAGE) genre.set(`_translations.${language}.name`, name);
      else genre.name = name;
    }
    await genre.save();
    const translated = convertToLanguage<LeanDocument<GenreDocument>>(language, genre.toObject());
    return plainToClass(GenreDetails, translated);
  }

  async remove(id: string) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedGenre = await this.genreModel.findByIdAndDelete(id).lean().exec()
      if (!deletedGenre)
        throw new HttpException({ code: StatusCode.GENRE_NOT_FOUND, message: 'Genre not found' }, HttpStatus.NOT_FOUND);
      await this.mediaService.deleteGenreMedia(id, <any[]>deletedGenre.media, session);
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
