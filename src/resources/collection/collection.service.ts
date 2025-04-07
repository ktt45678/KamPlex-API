import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, PopulateOptions, ClientSession, ProjectionType } from 'mongoose';
import { instanceToPlain, plainToClassFromExist, plainToInstance } from 'class-transformer';

import { MediaCollection, MediaCollectionDocument, MediaFile } from '../../schemas';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { CloudflareR2Service } from '../../common/modules/cloudflare-r2';
import { CreateCollectionDto, CursorPageCollectionsDto, CursorPageMediaDto, FindCollectionDto, PaginateCollectionsDto, RemoveCollectionsDto, UpdateCollectionDto } from './dto';
import { Collection as CollectionEntity, CollectionDetails } from './entities';
import { AuthUserDto } from '../users';
import { Media as MediaEntity } from '../media';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { WsAdminGateway } from '../ws-admin';
import { AuditLogType, CloudflareR2Container, MediaFileType, MediaPStatus, MediaVisibility, MongooseConnection, SocketMessage, SocketRoom, StatusCode } from '../../enums';
import { AuditLogBuilder, convertToLanguage, convertToLanguageArray, createSnowFlakeId, escapeRegExp, LookupOptions, MongooseCursorPagination, MongooseOffsetPagination, trimSlugFilename } from '../../utils';
import { I18N_DEFAULT_LANGUAGE } from '../../config';
import pLimit from 'p-limit';

@Injectable()
export class CollectionService {
  constructor(@InjectModel(MediaCollection.name, MongooseConnection.DATABASE_A) private collectionModel: Model<MediaCollectionDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService,
    private cloudflareR2Service: CloudflareR2Service, private wsAdminGateway: WsAdminGateway) { }

  async create(createCollectionDto: CreateCollectionDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { name, overview } = createCollectionDto;
    const collection = new this.collectionModel({ name, overview });
    collection._id = await createSnowFlakeId();
    const auditLog = new AuditLogBuilder(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_CREATE);
    auditLog.appendChange('name', collection.name);
    auditLog.appendChange('overview', collection.overview);
    await Promise.all([
      collection.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(SocketRoom.ADMIN_COLLECTION_LIST).emit(SocketMessage.REFRESH_COLLECTIONS);
    return collection.toObject();
  }

  async findAll(paginateCollectionDto: PaginateCollectionsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, poster: 1, backdrop: 1, mediaCount: 1, _translations: 1, createdAt: 1, updatedAt: 1 };
    const { page, limit, sort, search } = paginateCollectionDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.collectionModel.aggregate(aggregation.build()).exec();
    let collectionList = new Paginated<CollectionEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<CollectionEntity>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      collectionList = plainToClassFromExist(new Paginated<CollectionEntity>({ type: CollectionEntity }), {
        page: data.page,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        results: translatedResults
      });
    }
    return collectionList;
  }

  async findAllCursor(cursorPageCollectionsDto: CursorPageCollectionsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, poster: 1, backdrop: 1, mediaCount: 1, _translations: 1, createdAt: 1, updatedAt: 1 };
    const { pageToken, limit, search, sort } = cursorPageCollectionsDto;
    const filters = search ? { name: { $regex: `^${escapeRegExp(search)}`, $options: 'i' } } : {};
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, filters });
    const [data] = await this.collectionModel.aggregate(aggregation.build()).exec();
    let collectionList = new CursorPaginated<CollectionEntity>();
    if (data) {
      const translatedResults = convertToLanguageArray<CollectionEntity>(headers.acceptLanguage, data.results, {
        keepTranslationsObject: authUser.hasPermission
      });
      collectionList = plainToClassFromExist(new CursorPaginated<CollectionEntity>({ type: CollectionEntity }), {
        totalResults: data.totalResults,
        results: translatedResults,
        hasNextPage: data.hasNextPage,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken
      });
    }
    return collectionList;
  }

  async findOne(id: bigint, findCollectionDto: FindCollectionDto, headers: HeadersDto, authUser: AuthUserDto) {
    const { includeHiddenMedia, includeUnprocessedMedia } = findCollectionDto;
    const mediaPopulation: PopulateOptions = {
      path: 'media',
      select: {
        _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
        poster: 1, backdrop: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1, _translations: 1,
        createdAt: 1, updatedAt: 1
      }, match: {}
    };
    (!authUser.hasPermission || !includeHiddenMedia) && (mediaPopulation.match.visibility = MediaVisibility.PUBLIC);
    (!authUser.hasPermission || !includeUnprocessedMedia) && (mediaPopulation.match.pStatus = MediaPStatus.DONE);
    const collection = await this.collectionModel.findOne({ _id: id },
      { _id: 1, name: 1, overview: 1, poster: 1, backdrop: 1, media: 1, mediaCount: 1, _translations: 1, createdAt: 1, updatedAt: 1 }
    ).populate(mediaPopulation).lean().exec();
    if (!collection)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
    const translated = convertToLanguage<MediaCollection>(headers.acceptLanguage, collection, {
      keepTranslationsObject: authUser.hasPermission
    });
    return plainToInstance(CollectionDetails, translated);
  }

  async update(id: bigint, updateCollectionDto: UpdateCollectionDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateCollectionDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, overview, translate } = updateCollectionDto;
    const collection = await this.collectionModel.findOne({ _id: id }).exec();
    if (!collection)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_UPDATE);
    if (translate && translate !== I18N_DEFAULT_LANGUAGE) {
      const nameKey = `_translations.${translate}.name`;
      const oldName = collection.get(nameKey);
      if (name && name !== oldName) {
        auditLog.appendChange(nameKey, name, oldName);
        collection.set(nameKey, name);
      }
      const overviewKey = `_translations.${translate}.name`;
      const oldOverview = collection.get(overviewKey);
      if (overview && overview !== oldOverview) {
        auditLog.appendChange(overviewKey, overview, oldOverview);
        collection.set(overviewKey, overview);
      }
    } else {
      if (collection.name !== name) {
        auditLog.appendChange('name', name, collection.name);
        collection.name = name;
      }
      if (collection.overview !== overview) {
        auditLog.appendChange('overview', overview, collection.overview);
        collection.overview = overview;
      }
    }
    await Promise.all([
      collection.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const translated = convertToLanguage<MediaCollection>(updateCollectionDto.translate, collection.toObject(), {
      keepTranslationsObject: authUser.hasPermission
    });
    const serializedCollection = instanceToPlain(plainToInstance(CollectionDetails, translated));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionId: serializedCollection._id,
        collection: serializedCollection
      });
    return serializedCollection;
  }

  async remove(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedCollection: MediaCollection;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedCollection = await this.collectionModel.findOneAndDelete({ _id: id }, { session }).lean()
      if (!deletedCollection)
        throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteCollectionMedia(deletedCollection._id, <any[]>deletedCollection.media, session),
        this.auditLogService.createLog(authUser._id, deletedCollection._id, MediaCollection.name, AuditLogType.COLLECTION_DELETE)
      ]);
    }).finally(() => session.endSession().catch(() => { }));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${deletedCollection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionId: deletedCollection._id,
        deleted: true
      });
  }

  async removeMany(removeCollectionsDto: RemoveCollectionsDto, headers: HeadersDto, authUser: AuthUserDto) {
    let deleteCollectionIds: bigint[];
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      // Find all collections and delete
      const collections = await this.collectionModel.find({ _id: { $in: removeCollectionsDto.ids } }).lean().session(session);
      deleteCollectionIds = collections.map(g => g._id);
      await Promise.all([
        this.collectionModel.deleteMany({ _id: { $in: deleteCollectionIds } }, { session }),
        this.auditLogService.createManyLogs(authUser._id, deleteCollectionIds, MediaCollection.name, AuditLogType.COLLECTION_DELETE)
      ]);
      // Pull collections from media
      const deleteCollectionMediaLimit = pLimit(5);
      await Promise.all(collections.map(collection => deleteCollectionMediaLimit(() =>
        this.mediaService.deleteCollectionMedia(collection._id, <bigint[]><unknown>collection.media, session))));
    }).finally(() => session.endSession().catch(() => { }));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    const collectionDetailsRooms = deleteCollectionIds.map(id => `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${id}`);
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, ...collectionDetailsRooms])
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionIds: deleteCollectionIds,
        deleted: true
      });
  }

  async uploadPoster(id: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const collection = await this.collectionModel.findOne({ _id: id }, { poster: 1 }).exec();
    if (!collection)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
    const posterId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${posterId}/${trimmedFilename}`;
    const image = await this.cloudflareR2Service.upload(CloudflareR2Container.POSTERS, saveFile, file.filepath, file.detectedMimetype);
    if (collection.poster)
      await this.deleteCollectionImage(collection.poster, CloudflareR2Container.POSTERS);
    const poster = new MediaFile();
    poster._id = posterId;
    poster.type = MediaFileType.POSTER;
    poster.name = trimmedFilename;
    poster.color = file.color;
    poster.placeholder = file.thumbhash;
    poster.size = image.size;
    poster.mimeType = file.detectedMimetype;
    collection.poster = poster;
    try {
      await Promise.all([
        collection.save(),
        this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_POSTER_UPDATE)
      ]);
    } catch (e) {
      await this.cloudflareR2Service.delete(CloudflareR2Container.POSTERS, saveFile);
      throw e;
    }
    const serializedCollection = instanceToPlain(plainToInstance(CollectionDetails, collection.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionId: collection._id,
        collection: serializedCollection
      });
    return serializedCollection;
  }

  async deletePoster(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const collection = await this.collectionModel.findOne({ _id: id }, { poster: 1 }).exec();
    if (!collection)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
    if (!collection.poster) return;
    await this.deleteCollectionImage(collection.poster, CloudflareR2Container.POSTERS);
    collection.poster = undefined;
    await Promise.all([
      collection.save(),
      this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_POSTER_DELETE)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionId: collection._id
      });
  }

  async uploadBackdrop(id: bigint, file: Storage.MultipartFile, headers: HeadersDto, authUser: AuthUserDto) {
    const collection = await this.collectionModel.findOne({ _id: id }, { backdrop: 1 }).exec();
    if (!collection)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
    const backdropId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveFile = `${backdropId}/${trimmedFilename}`;
    const image = await this.cloudflareR2Service.upload(CloudflareR2Container.BACKDROPS, saveFile, file.filepath, file.detectedMimetype);
    if (collection.backdrop)
      await this.deleteCollectionImage(collection.backdrop, CloudflareR2Container.BACKDROPS);
    const backdrop = new MediaFile();
    backdrop._id = backdropId;
    backdrop.type = MediaFileType.BACKDROP;
    backdrop.name = trimmedFilename;
    backdrop.color = file.color;
    backdrop.placeholder = file.thumbhash;
    backdrop.size = image.size;
    backdrop.mimeType = file.detectedMimetype;
    collection.backdrop = backdrop;
    try {
      await Promise.all([
        collection.save(),
        this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_BACKDROP_UPDATE)
      ]);
    } catch (e) {
      await this.cloudflareR2Service.delete(CloudflareR2Container.BACKDROPS, saveFile);
      throw e;
    }
    const serializedCollection = instanceToPlain(plainToInstance(CollectionDetails, collection.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`)
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionId: collection._id,
        collection: serializedCollection
      });
    return serializedCollection;
  }

  async deleteBackdrop(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    const collection = await this.collectionModel.findOne({ _id: id }, { backdrop: 1 }).exec();
    if (!collection)
      throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
    if (!collection.backdrop) return;
    await this.deleteCollectionImage(collection.backdrop, CloudflareR2Container.BACKDROPS);
    collection.backdrop = undefined;
    await Promise.all([
      collection.save(),
      this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_BACKDROP_DELETE)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`)
      .emit(SocketMessage.REFRESH_COLLECTIONS, {
        collectionId: collection._id
      });
  }

  async findAllMedia(id: bigint, cursorPageMediaDto: CursorPageMediaDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id'];
    const fields = {
      _id: 1, type: 1, title: 1, originalTitle: 1, overview: 1, runtime: 1, 'movie.status': 1, 'tv.pEpisodeCount': 1,
      'tv.pLastEpisode': 1, poster: 1, backdrop: 1, genres: 1, originalLang: 1, adult: 1, releaseDate: 1, views: 1, visibility: 1,
      _translations: 1, createdAt: 1, updatedAt: 1
    };
    const { pageToken, limit, sort } = cursorPageMediaDto;
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum });
    const lookupOptions: LookupOptions = {
      from: 'media', localField: 'media', foreignField: '_id', as: 'media', isArray: true,
      pipeline: [{ $match: { visibility: MediaVisibility.PUBLIC, pStatus: MediaPStatus.DONE } }],
      children: [
        {
          from: 'genres', localField: 'genres', foreignField: '_id', as: 'genres', isArray: true,
          pipeline: [{ $project: { _id: 1, name: 1, _translations: 1 } }]
        },
        {
          from: 'tvepisodes', localField: 'tv.pLastEpisode', foreignField: '_id', as: 'tv.pLastEpisode', isArray: false,
          pipeline: [{ $project: { _id: 1, name: 1, epNumber: 1 } }]
        }
      ]
    };
    const [data] = await this.collectionModel.aggregate(aggregation.buildLookupOnly(id, lookupOptions)).exec();
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

  findById(id: bigint, projection: ProjectionType<MediaCollectionDocument> = { _id: 1, name: 1, _translations: 1 }) {
    return this.collectionModel.findOne({ _id: id }, projection).lean().exec();
  }

  addMediaCollection(mediaId: bigint, collectionId: bigint, session?: ClientSession) {
    return this.collectionModel.updateOne({ _id: collectionId }, { $push: { media: mediaId }, $inc: { mediaCount: 1 } }, { session });
  }

  deleteMediaCollection(mediaId: bigint, collectionId?: bigint, session?: ClientSession) {
    if (!collectionId) return;
    return this.collectionModel.updateOne({ _id: collectionId }, { $pull: { media: mediaId }, $inc: { mediaCount: -1 } }, { session });
  }

  addMediaCollections(mediaId: bigint, collectionIds: bigint[], session?: ClientSession) {
    if (collectionIds.length)
      return this.collectionModel.updateMany({ _id: { $in: collectionIds } }, { $push: { media: mediaId }, $inc: { mediaCount: 1 } }, { session });
  }

  deleteMediaCollections(mediaId: bigint, collectionIds?: bigint[], session?: ClientSession) {
    if (collectionIds.length)
      return this.collectionModel.updateMany({ _id: { $in: collectionIds } }, { $pull: { media: mediaId }, $inc: { mediaCount: -1 } }, { session });
  }

  updateMediaCollection(mediaId: bigint, newId?: bigint, oldId?: bigint, session?: ClientSession) {
    const writes: Parameters<typeof this.collectionModel.bulkWrite>[0] = [];
    if (oldId === newId)
      return;
    if (oldId)
      writes.push({ updateOne: { filter: { _id: <any>oldId }, update: { $pull: { media: mediaId }, $inc: { mediaCount: -1 } } } });
    if (newId)
      writes.push({ updateOne: { filter: { _id: <any>newId }, update: { $push: { media: mediaId }, $inc: { mediaCount: 1 } } } });
    return this.collectionModel.bulkWrite(writes, { session });
  }

  updateMediaCollections(mediaId: bigint, newIds?: bigint[], oldIds?: bigint[], session?: ClientSession) {
    const writes: Parameters<typeof this.collectionModel.bulkWrite>[0] = [];
    if (oldIds.length)
      writes.push({ updateMany: { filter: { _id: { $in: <any>oldIds } }, update: { $pull: { media: mediaId }, $inc: { mediaCount: -1 } } } });
    if (newIds.length)
      writes.push({ updateMany: { filter: { _id: { $in: <any>newIds } }, update: { $push: { media: mediaId }, $inc: { mediaCount: 1 } } } });
    return this.collectionModel.bulkWrite(writes, { session });
  }

  private async deleteCollectionImage(image: MediaFile, container: string) {
    if (!image) return;
    await this.cloudflareR2Service.delete(container, `${image._id}/${image.name}`);
  }
}
