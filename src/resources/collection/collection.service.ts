import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, PopulateOptions, ClientSession } from 'mongoose';
import { instanceToPlain, plainToClassFromExist, plainToInstance } from 'class-transformer';

import { MediaCollection, MediaCollectionDocument, MediaFile } from '../../schemas';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MediaService } from '../media/media.service';
import { AzureBlobService } from '../../common/modules/azure-blob/azure-blob.service';
import { CreateCollectionDto, FindCollectionDto, PaginateCollectionsDto, UpdateCollectionDto } from './dto';
import { Collection as CollectionEntity, CollectionDetails } from './entities';
import { AuthUserDto } from '../users';
import { HeadersDto } from '../../common/dto';
import { Paginated } from '../../common/entities';
import { WsAdminGateway } from '../ws-admin';
import { AuditLogType, AzureStorageContainer, MediaFileType, MediaPStatus, MediaVisibility, MongooseConnection, SocketMessage, SocketRoom, StatusCode } from '../../enums';
import { AuditLogBuilder, convertToLanguage, convertToLanguageArray, createSnowFlakeId, escapeRegExp, MongooseOffsetPagination, trimSlugFilename } from '../../utils';
import { I18N_DEFAULT_LANGUAGE } from '../../config';

@Injectable()
export class CollectionService {
  constructor(@InjectModel(MediaCollection.name, MongooseConnection.DATABASE_A) private collectionModel: Model<MediaCollectionDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService,
    private azureBlobService: AzureBlobService, private wsAdminGateway: WsAdminGateway) { }

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
    ioEmitter.to(SocketRoom.ADMIN_COLLECTION_LIST).emit(SocketMessage.REFRESH_COLLECTION);
    return collection.toObject();
  }

  async findAll(paginateCollectionDto: PaginateCollectionsDto, headers: HeadersDto, authUser: AuthUserDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, poster: 1, backdrop: 1, _translations: 1, createdAt: 1, updatedAt: 1 };
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
      { _id: 1, name: 1, overview: 1, poster: 1, backdrop: 1, media: 1, _translations: 1, createdAt: 1, updatedAt: 1 }
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
      const nameKey = `_translations.${updateCollectionDto.translate}.name`;
      const oldName = collection.get(nameKey);
      if (name && name !== oldName) {
        auditLog.appendChange(nameKey, name, oldName);
        collection.set(nameKey, name);
      }
      const overviewKey = `_translations.${updateCollectionDto.translate}.name`;
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
      .emit(SocketMessage.REFRESH_COLLECTION, {
        collectionId: serializedCollection._id,
        collection: serializedCollection
      });
    return serializedCollection;
  }

  async remove(id: bigint, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedCollection: MediaCollection;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedCollection = await this.collectionModel.findOneAndDelete({ _id: id }).lean().exec()
      if (!deletedCollection)
        throw new HttpException({ code: StatusCode.COLLECTION_NOT_FOUND, message: 'Collection not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteCollectionMedia(<any[]>deletedCollection.media, session),
        this.auditLogService.createLog(authUser._id, deletedCollection._id, MediaCollection.name, AuditLogType.COLLECTION_DELETE)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${deletedCollection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTION, {
        collectionId: deletedCollection._id,
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
    const image = await this.azureBlobService.upload(AzureStorageContainer.POSTERS, saveFile, file.filepath, file.detectedMimetype);
    if (collection.poster)
      await this.deleteCollectionImage(collection.poster, AzureStorageContainer.POSTERS);
    const poster = new MediaFile();
    poster._id = posterId;
    poster.type = MediaFileType.POSTER;
    poster.name = trimmedFilename;
    poster.color = file.color;
    poster.size = image.contentLength;
    poster.mimeType = file.detectedMimetype;
    collection.poster = poster;
    try {
      await Promise.all([
        collection.save(),
        this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_POSTER_UPDATE)
      ]);
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.POSTERS, saveFile);
      throw e;
    }
    const serializedCollection = instanceToPlain(plainToInstance(CollectionDetails, collection.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTION, {
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
    await this.deleteCollectionImage(collection.poster, AzureStorageContainer.POSTERS);
    collection.poster = undefined;
    await Promise.all([
      collection.save(),
      this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_POSTER_DELETE)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_COLLECTION_LIST, `${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`])
      .emit(SocketMessage.REFRESH_COLLECTION, {
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
    const image = await this.azureBlobService.upload(AzureStorageContainer.BACKDROPS, saveFile, file.filepath, file.detectedMimetype);
    if (collection.backdrop)
      await this.deleteCollectionImage(collection.backdrop, AzureStorageContainer.BACKDROPS);
    const backdrop = new MediaFile();
    backdrop._id = backdropId;
    backdrop.type = MediaFileType.BACKDROP;
    backdrop.name = trimmedFilename;
    backdrop.color = file.color;
    backdrop.size = image.contentLength;
    backdrop.mimeType = file.detectedMimetype;
    collection.backdrop = backdrop;
    try {
      await Promise.all([
        collection.save(),
        this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_BACKDROP_UPDATE)
      ]);
    } catch (e) {
      await this.azureBlobService.delete(AzureStorageContainer.BACKDROPS, saveFile);
      throw e;
    }
    const serializedCollection = instanceToPlain(plainToInstance(CollectionDetails, collection.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`)
      .emit(SocketMessage.REFRESH_COLLECTION, {
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
    await this.deleteCollectionImage(collection.backdrop, AzureStorageContainer.BACKDROPS);
    collection.backdrop = undefined;
    await Promise.all([
      collection.save(),
      this.auditLogService.createLog(authUser._id, collection._id, MediaCollection.name, AuditLogType.COLLECTION_BACKDROP_DELETE)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(`${SocketRoom.ADMIN_COLLECTION_DETAILS}:${collection._id}`)
      .emit(SocketMessage.REFRESH_COLLECTION, {
        collectionId: collection._id
      });
  }

  addMediaCollection(mediaId: bigint, collectionId: bigint, session?: ClientSession) {
    return this.collectionModel.updateOne({ _id: collectionId }, { $push: { media: mediaId } }, { session });
  }

  deleteMediaCollection(mediaId: bigint, collectionId: bigint, session?: ClientSession) {
    return this.collectionModel.updateOne({ _id: collectionId }, { $pull: { media: mediaId } }, { session });
  }

  private async deleteCollectionImage(image: MediaFile, container: string) {
    if (!image) return;
    await this.azureBlobService.delete(container, `${image._id}/${image.name}`);
  }
}
