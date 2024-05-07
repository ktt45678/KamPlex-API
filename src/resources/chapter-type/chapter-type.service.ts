import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, ProjectionType } from 'mongoose';
import { instanceToPlain, plainToClassFromExist, plainToInstance } from 'class-transformer';

import { CreateChapterTypeDto, OffsetPageChapterTypesDto, UpdateChapterTypeDto } from './dto';
import { ChapterType as ChapterTypeEntity } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { AuthUserDto } from '../users';
import { HeadersDto } from '../../common/dto';
import { Paginated } from '../../common/entities';
import { WsAdminGateway } from '../ws-admin';
import { ChapterType, ChapterTypeDocument } from '../../schemas';
import { AuditLogType, MongooseConnection, SocketMessage, SocketRoom, StatusCode } from '../../enums';
import { AuditLogBuilder, MongooseOffsetPagination, convertToLanguage, convertToLanguageArray, createSnowFlakeId, escapeRegExp } from '../../utils';
import { I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class ChapterTypeService {
  constructor(@InjectModel(ChapterType.name, MongooseConnection.DATABASE_A) private chapterTypeModel: Model<ChapterTypeDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService,
    private wsAdminGateway: WsAdminGateway) { }

  async create(createChapterTypeDto: CreateChapterTypeDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { name } = createChapterTypeDto;
    const checkChapterType = await this.chapterTypeModel.findOne({ name }).lean().exec();
    if (checkChapterType)
      throw new HttpException({ code: StatusCode.CHAPTER_TYPE_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
    const chapterType = new this.chapterTypeModel({ name });
    chapterType._id = await createSnowFlakeId();
    const auditLog = new AuditLogBuilder(authUser._id, chapterType._id, ChapterType.name, AuditLogType.CHAPTER_TYPE_CREATE);
    auditLog.appendChange('name', chapterType.name);
    await Promise.all([
      chapterType.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(SocketRoom.ADMIN_CHAPTER_TYPE_LIST).emit(SocketMessage.REFRESH_CHAPTER_TYPES);
    return chapterType.toObject();
  }

  async findAll(offsetPageChapterTypesDto: OffsetPageChapterTypesDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 };
    const { page, limit, sort, search } = offsetPageChapterTypesDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.chapterTypeModel.aggregate(aggregation.build()).exec();
    let chapterTypeList = new Paginated<ChapterTypeEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<ChapterTypeEntity>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      chapterTypeList = plainToClassFromExist(new Paginated<ChapterTypeEntity>({ type: ChapterTypeEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return chapterTypeList;
  }

  async findOne(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const chapterType = await this.chapterTypeModel.findOne({ _id: id },
      { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 }
    ).lean().exec();
    if (!chapterType)
      throw new HttpException({ code: StatusCode.CHAPTER_TYPE_NOT_FOUND, message: 'Chapter type not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<ChapterType>(headers.acceptLanguage, chapterType, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(ChapterTypeEntity, translated);
  }

  async update(id: bigint, updateChapterTypeDto: UpdateChapterTypeDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateChapterTypeDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, translate } = updateChapterTypeDto;
    const chapterType = await this.chapterTypeModel.findOne({ _id: id }).exec();
    if (!chapterType)
      throw new HttpException({ code: StatusCode.CHAPTER_TYPE_NOT_FOUND, message: 'Chapter type not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, chapterType._id, ChapterType.name, AuditLogType.CHAPTER_TYPE_UPDATE);
    if (translate && translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${translate}.name`;
      const oldName = chapterType.get(nameKey);
      if (name && name !== oldName) {
        auditLog.appendChange(nameKey, name, oldName);
        chapterType.set(nameKey, name);
      }
    } else {
      if (chapterType.name !== name) {
        auditLog.appendChange('name', name, chapterType.name);
        chapterType.name = name;
      }
    }
    await Promise.all([
      chapterType.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const translated = convertToLanguage<ChapterType>(updateChapterTypeDto.translate, chapterType.toObject(), {
      keepTranslationsObject: authUser.hasPermission
    });
    const serializedChapterType = instanceToPlain(plainToInstance(ChapterTypeEntity, translated));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_CHAPTER_TYPE_LIST, `${SocketRoom.ADMIN_CHAPTER_TYPE_DETAILS}:${chapterType._id}`])
      .emit(SocketMessage.REFRESH_CHAPTER_TYPES, {
        chapterTypeId: serializedChapterType._id,
        chapterType: serializedChapterType
      });
    return serializedChapterType;
  }

  async remove(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedChapterType: ChapterType;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedChapterType = await this.chapterTypeModel.findOneAndDelete({ _id: id }, { session }).lean()
      if (!deletedChapterType)
        throw new HttpException({ code: StatusCode.CHAPTER_TYPE_NOT_FOUND, message: 'Chapter type not found' }, HttpStatus.NOT_FOUND);
      if ((deletedChapterType.media.length || deletedChapterType.episodes.length) && !authUser.owner)
        throw new HttpException({ code: StatusCode.CHAPTER_TYPE_IN_USE, message: 'Cannot delete a chapter that is in use' }, HttpStatus.FORBIDDEN);
      await Promise.all([
        this.mediaService.deleteChapterMedia(id, <bigint[]><unknown>deletedChapterType.media, <bigint[]><unknown>deletedChapterType.episodes, session),
        this.auditLogService.createLog(authUser._id, deletedChapterType._id, ChapterType.name, AuditLogType.CHAPTER_TYPE_DELETE)
      ]);
    }).finally(() => session.endSession().catch(() => { }));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_CHAPTER_TYPE_LIST, `${SocketRoom.ADMIN_CHAPTER_TYPE_DETAILS}:${deletedChapterType._id}`])
      .emit(SocketMessage.REFRESH_CHAPTER_TYPES, {
        chapterTypeId: deletedChapterType._id,
        deleted: true
      });
  }

  findById(id: bigint, projection: ProjectionType<ChapterTypeDocument> = { _id: 1, name: 1, _translations: 1 }) {
    return this.chapterTypeModel.findOne({ _id: id }, projection).lean().exec();
  }

  addMovieChapterType(mediaId: bigint, chapterTypeId: bigint, session?: ClientSession) {
    return this.addMediaChapterType('media', mediaId, chapterTypeId, session);
  }

  addMovieChapterTypes(mediaId: bigint, chapterTypeId: bigint[], session?: ClientSession) {
    return this.addMediaChapterTypes('media', mediaId, chapterTypeId, session);
  }

  deleteMovieChapterType(mediaId: bigint, chapterTypeId: bigint, session?: ClientSession) {
    return this.deleteMediaChapterType('media', mediaId, chapterTypeId, session);
  }

  deleteMovieChapterTypes(mediaId: bigint, chapterTypeId: bigint[], session?: ClientSession) {
    return this.deleteMediaChapterTypes('media', mediaId, chapterTypeId, session);
  }

  addTVEpisodeChapterType(episodeId: bigint, chapterTypeId: bigint, session?: ClientSession) {
    return this.addMediaChapterType('episodes', episodeId, chapterTypeId, session);
  }

  addTVEpisodeChapterTypes(episodeId: bigint, chapterTypeId: bigint[], session?: ClientSession) {
    return this.addMediaChapterTypes('episodes', episodeId, chapterTypeId, session);
  }

  deleteTVEpisodeChapterType(episodeId: bigint, chapterTypeId: bigint, session?: ClientSession) {
    return this.deleteMediaChapterType('episodes', episodeId, chapterTypeId, session);
  }

  deleteTVEpisodeChapterTypes(episodeId: bigint, chapterTypeId: bigint[], session?: ClientSession) {
    return this.deleteMediaChapterTypes('episodes', episodeId, chapterTypeId, session);
  }

  addMediaChapterType(field: 'media' | 'episodes', id: bigint, chapterTypeId: bigint, session?: ClientSession) {
    return this.chapterTypeModel.updateOne({ _id: chapterTypeId }, { $push: { [field]: id } }, { session });
  }

  addMediaChapterTypes(field: 'media' | 'episodes', id: bigint, chapterTypeIds: bigint[], session?: ClientSession) {
    if (chapterTypeIds.length)
      return this.chapterTypeModel.updateMany({ _id: { $in: chapterTypeIds } }, { $push: { [field]: id } }, { session });
  }

  deleteMediaChapterType(field: 'media' | 'episodes', id: bigint, chapterTypeId: bigint, session?: ClientSession) {
    return this.chapterTypeModel.updateOne({ _id: chapterTypeId }, { $pull: { [field]: id } }, { session });
  }

  deleteMediaChapterTypes(field: 'media' | 'episodes', id: bigint, chapterTypeIds: bigint[], session?: ClientSession) {
    if (chapterTypeIds.length)
      return this.chapterTypeModel.updateMany({ _id: { $in: chapterTypeIds } }, { $pull: { [field]: id } }, { session });
  }

  updateMovieChapterType(mediaId: bigint, oldId?: bigint, newId?: bigint, session?: ClientSession) {
    return this.updateMediaChapterType('media', mediaId, oldId, newId, session);
  }

  updateMovieChapterTypes(mediaId: bigint, oldIds: bigint[], newIds: bigint[], session?: ClientSession) {
    return this.updateMediaChapterTypes('media', mediaId, oldIds, newIds, session);
  }

  updateTVEpisodeChapterType(episodeId: bigint, oldId?: bigint, newId?: bigint, session?: ClientSession) {
    return this.updateMediaChapterType('episodes', episodeId, oldId, newId, session);
  }

  updateTVEpisodeChapterTypes(episodeId: bigint, oldIds: bigint[], newIds: bigint[], session?: ClientSession) {
    return this.updateMediaChapterTypes('episodes', episodeId, oldIds, newIds, session);
  }

  updateMediaChapterType(field: 'media' | 'episodes', id: bigint, oldId?: bigint, newId?: bigint, session?: ClientSession) {
    const writes: Parameters<typeof this.chapterTypeModel.bulkWrite>[0] = [];
    if (oldId === newId)
      return;
    if (oldId)
      writes.push({ updateOne: { filter: { _id: <any>oldId }, update: { $pull: { [field]: id } } } });
    if (newId)
      writes.push({ updateOne: { filter: { _id: <any>newId }, update: { $push: { [field]: id } } } });
    return this.chapterTypeModel.bulkWrite(writes, { session });
  }

  updateMediaChapterTypes(field: 'media' | 'episodes', id: bigint, oldIds: bigint[], newIds: bigint[], session?: ClientSession) {
    const writes: Parameters<typeof this.chapterTypeModel.bulkWrite>[0] = [];
    if (oldIds.length)
      writes.push({ updateMany: { filter: { _id: { $in: <any>oldIds } }, update: { $pull: { [field]: id } } } });
    if (newIds.length)
      writes.push({ updateMany: { filter: { _id: { $in: <any>newIds } }, update: { $push: { [field]: id } } } });
    return this.chapterTypeModel.bulkWrite(writes, { session });
  }
}
