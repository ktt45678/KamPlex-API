import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, LeanDocument, ClientSession } from 'mongoose';
import { instanceToPlain, plainToClassFromExist, plainToInstance } from 'class-transformer';
import pLimit from 'p-limit';

import { MediaTag, MediaTagDocument } from '../../schemas';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { CreateTagDto, CursorPageTagsDto, PaginateTagsDto, RemoveTagsDto, UpdateTagDto } from './dto';
import { Tag, TagDetails } from './entities';
import { AuthUserDto } from '../users';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { AuditLogType, MongooseConnection, SocketMessage, SocketRoom, StatusCode } from '../../enums';
import { AuditLogBuilder, convertToLanguage, convertToLanguageArray, createSnowFlakeId, escapeRegExp, MongooseCursorPagination, MongooseOffsetPagination, tokenDataToPageToken } from '../../utils';
import { I18N_DEFAULT_LANGUAGE } from '../../config';
import { WsAdminGateway } from '../ws-admin';

@Injectable()
export class TagsService {
  constructor(@InjectModel(MediaTag.name, MongooseConnection.DATABASE_A) private mediaTagModel: Model<MediaTagDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService,
    private wsAdminGateway: WsAdminGateway) { }

  async create(createTagDto: CreateTagDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { name } = createTagDto;
    const checkTag = await this.mediaTagModel.findOne({ name }).lean().exec();
    if (checkTag)
      throw new HttpException({ code: StatusCode.TAG_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
    const tag = new this.mediaTagModel();
    tag._id = await createSnowFlakeId();
    tag.name = name;
    const auditLog = new AuditLogBuilder(authUser._id, tag._id, MediaTag.name, AuditLogType.TAG_CREATE);
    auditLog.appendChange('name', tag.name);
    await Promise.all([
      tag.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(SocketRoom.ADMIN_TAG_LIST).emit(SocketMessage.REFRESH_TAGS);
    return tag.toObject();
  }

  async findAll(paginateTagsDto: PaginateTagsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { page, limit, sort, search } = paginateTagsDto;
    const filters = search ? { name: { $regex: `^${escapeRegExp(search)}`, $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.mediaTagModel.aggregate(aggregation.build()).exec();
    let tagList = new Paginated<Tag>();
    if (data) {
      const translatedResults = convertToLanguageArray<Tag>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      tagList = plainToClassFromExist(new Paginated<Tag>({ type: Tag }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return tagList;
  }

  async findAllCursor(cursorPageTagsDto: CursorPageTagsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { pageToken, limit, search, sort } = cursorPageTagsDto;
    const filters = search ? { name: { $regex: `^${escapeRegExp(search)}`, $options: 'i' } } : {};
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, filters });
    const [data] = await this.mediaTagModel.aggregate(aggregation.build()).exec();
    let tagList = new CursorPaginated<Tag>();
    if (data) {
      const translatedResults = convertToLanguageArray<Tag>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      tagList = plainToClassFromExist(new CursorPaginated<Tag>({ type: Tag }), {
        totalResults: data.totalResults,
        results: translatedResults,
        hasNextPage: data.hasNextPage,
        nextPageToken: tokenDataToPageToken(data.nextPageToken),
        prevPageToken: tokenDataToPageToken(data.prevPageToken)
      });
    }
    return tagList;
  }

  async findOne(id: string, headers: HeadersDto, authUser: AuthUserDto) {
    const tag = await this.mediaTagModel.findById(id, { _id: 1, name: 1, _translations: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!tag)
      throw new HttpException({ code: StatusCode.TAG_NOT_FOUND, message: 'Tag not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<LeanDocument<MediaTagDocument>>(headers.acceptLanguage, tag, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(TagDetails, translated);
  }

  async update(id: string, updateTagDto: UpdateTagDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateTagDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, translate } = updateTagDto;
    const tag = await this.mediaTagModel.findById(id).exec();
    if (!tag)
      throw new HttpException({ code: StatusCode.TAG_NOT_FOUND, message: 'Tag not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, tag._id, Tag.name, AuditLogType.TAG_UPDATE);
    if (translate && translate !== I18N_DEFAULT_LANGUAGE && name) {
      const nameKey = `_translations.${translate}.name`;
      const oldName = tag.get(nameKey);
      if (oldName !== name) {
        const checkTag = await this.mediaTagModel.findOne({ [nameKey]: name }).lean().exec();
        if (checkTag)
          throw new HttpException({ code: StatusCode.TAG_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
        auditLog.appendChange(nameKey, name, oldName);
        tag.set(nameKey, name);
      }
    }
    else {
      if (name && tag.name !== name) {
        const checkTag = await this.mediaTagModel.findOne({ name }).lean().exec();
        if (checkTag)
          throw new HttpException({ code: StatusCode.TAG_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
        auditLog.appendChange('name', name, tag.name);
        tag.name = name;
      }
    }
    await Promise.all([
      tag.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const translated = convertToLanguage<LeanDocument<MediaTagDocument>>(translate, tag.toObject(), {
      keepTranslationsObject: authUser.hasPermission
    });
    const serializedTag = instanceToPlain(plainToInstance(TagDetails, translated));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_TAG_LIST, `${SocketRoom.ADMIN_TAG_DETAILS}:${translated._id}`])
      .emit(SocketMessage.REFRESH_TAGS, {
        tagId: translated._id,
        tag: serializedTag
      });
    return serializedTag;
  }

  async remove(id: string, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedTag: LeanDocument<MediaTag>;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedTag = await this.mediaTagModel.findByIdAndDelete(id).lean().exec()
      if (!deletedTag)
        throw new HttpException({ code: StatusCode.TAG_NOT_FOUND, message: 'Tag not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteTagMedia(id, <any[]>deletedTag.media, session),
        this.auditLogService.createLog(authUser._id, deletedTag._id, MediaTag.name, AuditLogType.TAG_DELETE)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_TAG_LIST, `${SocketRoom.ADMIN_TAG_DETAILS}:${deletedTag._id}`])
      .emit(SocketMessage.REFRESH_TAGS, {
        tagId: deletedTag._id,
        deleted: true
      });
  }

  async removeMany(removeTagsDto: RemoveTagsDto, headers: HeadersDto, authUser: AuthUserDto) {
    let deleteTagIds: string[];
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const tags = await this.mediaTagModel.find({ _id: { $in: removeTagsDto.ids } }).lean().session(session);
      deleteTagIds = tags.map(g => g._id);
      await Promise.all([
        this.mediaTagModel.deleteMany({ _id: { $in: deleteTagIds } }, { session }),
        this.auditLogService.createManyLogs(authUser._id, deleteTagIds, Tag.name, AuditLogType.TAG_DELETE)
      ]);
      const deleteTagMediaLimit = pLimit(5);
      await Promise.all(tags.map(tag => deleteTagMediaLimit(() =>
        this.mediaService.deleteTagMedia(tag.id, <string[]><unknown>tag.media, session))));
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    const tagDetailsRooms = deleteTagIds.map(id => `${SocketRoom.ADMIN_TAG_DETAILS}:${id}`);
    ioEmitter.to([SocketRoom.ADMIN_TAG_LIST, ...tagDetailsRooms])
      .emit(SocketMessage.REFRESH_TAGS, {
        tagIds: deleteTagIds,
        deleted: true
      });
  }

  findByName(name: string, language: string) {
    let filters: { [key: string]: any } = { name };
    if (language && language !== I18N_DEFAULT_LANGUAGE) {
      const languageKey = `_translations.${language}.name`;
      filters = { [languageKey]: name };
    }
    return this.mediaTagModel.findOne(filters).lean().exec();
  }

  async createMany(tags: { name: string }[], session?: ClientSession) {
    const createdTags: LeanDocument<MediaTagDocument>[] = [];
    for (let i = 0; i < tags.length; i++) {
      const tagId = await createSnowFlakeId();
      const tag = await this.mediaTagModel.findOneAndUpdate(tags[i], { $setOnInsert: { _id: tagId } },
        { new: true, upsert: true, session }
      ).lean().exec();
      createdTags.push(tag);
    }
    return createdTags;
  }

  countByIds(ids: string[]) {
    return this.mediaTagModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  addMediaTags(mediaId: string, tagIds: string[], session?: ClientSession) {
    if (tagIds.length)
      return this.mediaTagModel.updateMany({ _id: { $in: tagIds } }, { $push: { media: <any>mediaId } }, { session });
  }

  deleteMediaTags(mediaId: string, tagIds: string[], session?: ClientSession) {
    if (tagIds.length)
      return this.mediaTagModel.updateMany({ _id: { $in: tagIds } }, { $pull: { media: <any>mediaId } }, { session });
  }
}
