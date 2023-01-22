import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Connection, LeanDocument } from 'mongoose';
import { instanceToInstance, plainToClassFromExist, plainToInstance } from 'class-transformer';
import pLimit from 'p-limit';

import { Production, ProductionDocument } from '../../schemas';
import { CreateProductionDto, CursorPageProductionsDto, RemoveProductionsDto, UpdateProductionDto } from './dto';
import { Production as ProductionEntity, ProductionDetails } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthUserDto } from '../users';
import { PaginateDto } from '../roles';
import { WsAdminGateway } from '../ws-admin';
import { MediaService } from '../media/media.service';
import { HeadersDto } from '../../common/dto';
import { CursorPaginated, Paginated } from '../../common/entities';
import { StatusCode, AuditLogType, MongooseConnection, SocketRoom, SocketMessage } from '../../enums';
import { MongooseOffsetPagination, escapeRegExp, createSnowFlakeId, AuditLogBuilder, MongooseCursorPagination, tokenDataToPageToken } from '../../utils';

@Injectable()
export class ProductionsService {
  constructor(@InjectModel(Production.name, MongooseConnection.DATABASE_A) private productionModel: Model<ProductionDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService,
    private wsAdminGateway: WsAdminGateway) { }

  async create(createProductionDto: CreateProductionDto, headers: HeadersDto, authUser: AuthUserDto) {
    const checkProduction = await this.productionModel.findOne({ name: createProductionDto.name });
    if (checkProduction)
      throw new HttpException({ code: StatusCode.PRODUCTION_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
    const production = new this.productionModel();
    production._id = await createSnowFlakeId();
    production.name = createProductionDto.name;
    production.country = createProductionDto.country;
    const auditLog = new AuditLogBuilder(authUser._id, production._id, Production.name, AuditLogType.PRODUCTION_CREATE);
    auditLog.appendChange('name', createProductionDto.name);
    auditLog.appendChange('country', createProductionDto.country);
    await Promise.all([
      production.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to(SocketRoom.ADMIN_PRODUCTION_LIST).emit(SocketMessage.REFRESH_PRODUCTIONS);
    return production.toObject();
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'name', 'country'];
    const fields = { _id: 1, name: 1, country: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.productionModel.aggregate(aggregation.build()).exec();
    return data ? data : new Paginated();
  }

  async findAllCursor(cursorPageProductionsDto: CursorPageProductionsDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, _translations: 1 };
    const { pageToken, limit, search, sort } = cursorPageProductionsDto;
    const filters = search ? { name: { $regex: `^${escapeRegExp(search)}`, $options: 'i' } } : {};
    const aggregation = new MongooseCursorPagination({ pageToken, limit, fields, sortQuery: sort, sortEnum, filters });
    const [data] = await this.productionModel.aggregate(aggregation.build()).exec();
    let productionList = new CursorPaginated<ProductionEntity>();
    if (data) {
      productionList = plainToClassFromExist(new CursorPaginated<ProductionEntity>({ type: ProductionEntity }), {
        totalResults: data.totalResults,
        results: data.results,
        hasNextPage: data.hasNextPage,
        nextPageToken: tokenDataToPageToken(data.nextPageToken),
        prevPageToken: tokenDataToPageToken(data.prevPageToken)
      });
    }
    return productionList;
  }

  async findOne(id: string) {
    const production = await this.productionModel.findById(id, { _id: 1, name: 1, country: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!production)
      throw new HttpException({ code: StatusCode.PRODUCTION_NOT_FOUND, message: 'Production not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(ProductionDetails, production);
  }

  async update(id: string, updateProductionDto: UpdateProductionDto, headers: HeadersDto, authUser: AuthUserDto) {
    if (!Object.keys(updateProductionDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, country } = updateProductionDto;
    const production = await this.productionModel.findById(id).exec();
    if (!production)
      throw new HttpException({ code: StatusCode.PRODUCTION_NOT_FOUND, message: 'Production not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, production._id, Production.name, AuditLogType.PRODUCTION_UPDATE);
    if (name && name !== production.name) {
      const checkProduction = await this.productionModel.findOne({ name });
      if (checkProduction)
        throw new HttpException({ code: StatusCode.PRODUCTION_EXIST, message: 'Name has already been used' }, HttpStatus.BAD_REQUEST);
      auditLog.appendChange('name', name, production.name);
      production.name = name;
    }
    if (country !== undefined && production.country !== country) {
      auditLog.appendChange('country', country, production.country);
      production.country = country;
    }
    await Promise.all([
      production.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    const serializedProduction = instanceToInstance(plainToInstance(ProductionDetails, production.toObject()));
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_PRODUCTION_LIST, `${SocketRoom.ADMIN_PRODUCTION_DETAILS}:${serializedProduction._id}`])
      .emit(SocketMessage.REFRESH_PRODUCTIONS, {
        productionId: serializedProduction._id,
        production: serializedProduction
      });
    return serializedProduction;
  }

  async remove(id: string, headers: HeadersDto, authUser: AuthUserDto) {
    let deletedProduction: LeanDocument<Production>;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      deletedProduction = await this.productionModel.findByIdAndDelete(id).lean().exec();
      if (!deletedProduction)
        throw new HttpException({ code: StatusCode.PRODUCTION_NOT_FOUND, message: 'Production not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteProductionMedia(id, <any[]>deletedProduction.media, session),
        this.auditLogService.createLog(authUser._id, deletedProduction._id, Production.name, AuditLogType.PRODUCTION_DELETE)
      ]);
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    ioEmitter.to([SocketRoom.ADMIN_PRODUCTION_LIST, `${SocketRoom.ADMIN_PRODUCTION_DETAILS}:${deletedProduction._id}`])
      .emit(SocketMessage.REFRESH_PRODUCTIONS, {
        productionId: deletedProduction._id,
        deleted: true
      });
  }

  async removeMany(removeProductionsDto: RemoveProductionsDto, headers: HeadersDto, authUser: AuthUserDto) {
    let deleteProductionIds: string[];
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const productions = await this.productionModel.find({ _id: { $in: removeProductionsDto.ids } }).lean().session(session);
      deleteProductionIds = productions.map(g => g._id);
      await Promise.all([
        this.productionModel.deleteMany({ _id: { $in: deleteProductionIds } }, { session }),
        this.auditLogService.createManyLogs(authUser._id, deleteProductionIds, Production.name, AuditLogType.PRODUCTION_DELETE)
      ]);
      const deleteProductionMediaLimit = pLimit(5);
      await Promise.all(productions.map(production => deleteProductionMediaLimit(() =>
        this.mediaService.deleteProductionMedia(production.id, <string[]><unknown>production.media, session))));
    });
    const ioEmitter = (headers.socketId && this.wsAdminGateway.server.sockets.get(headers.socketId)) || this.wsAdminGateway.server;
    const productionDetailsRooms = deleteProductionIds.map(id => `${SocketRoom.ADMIN_PRODUCTION_DETAILS}:${id}`);
    ioEmitter.to([SocketRoom.ADMIN_PRODUCTION_LIST, ...productionDetailsRooms])
      .emit(SocketMessage.REFRESH_PRODUCTIONS, {
        productionIds: deleteProductionIds,
        deleted: true
      });
  }

  findByName(name: string) {
    return this.productionModel.findOne({ name }).lean().exec();
  }

  async createMany(productions: { name: string, country: string }[], session?: ClientSession) {
    const createdProductions: LeanDocument<ProductionDocument>[] = [];
    for (let i = 0; i < productions.length; i++) {
      const productionId = await createSnowFlakeId();
      const production = await this.productionModel.findOneAndUpdate({ name: productions[i].name },
        { $setOnInsert: { _id: productionId, country: productions[i].country } },
        { new: true, upsert: true, session }
      ).lean().exec();
      createdProductions.push(production);
    }
    return createdProductions;
  }

  countByIds(ids: string[]) {
    return this.productionModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  addMediaProductions(media: string, ids: string[], session?: ClientSession) {
    if (ids.length)
      return this.productionModel.updateMany({ _id: { $in: ids } }, { $push: { media: <any>media } }, { session });
  }

  deleteMediaProductions(media: string, ids: string[], session?: ClientSession) {
    if (ids.length)
      return this.productionModel.updateMany({ _id: { $in: ids } }, { $pull: { media: <any>media } }, { session });
  }
}
