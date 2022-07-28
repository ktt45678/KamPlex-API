import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Connection, LeanDocument } from 'mongoose';
import { plainToInstance } from 'class-transformer';

import { Production, ProductionDocument } from '../../schemas';
import { CreateProductionDto, UpdateProductionDto } from './dto';
import { ProductionDetails } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthUserDto } from '../users';
import { PaginateDto, Paginated } from '../roles';
import { MediaService } from '../media/media.service';
import { StatusCode, AuditLogType, MongooseConnection } from '../../enums';
import { MongooseAggregation, escapeRegExp, createSnowFlakeId, AuditLogBuilder } from '../../utils';

@Injectable()
export class ProductionsService {
  constructor(@InjectModel(Production.name, MongooseConnection.DATABASE_A) private productionModel: Model<ProductionDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private auditLogService: AuditLogService, @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async create(createProductionDto: CreateProductionDto, authUser: AuthUserDto) {
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
    return production.toObject();
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'name', 'country'];
    const fields = { _id: 1, name: 1, country: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.productionModel.aggregate(aggregation.build()).exec();
    return data ? data : new Paginated();
  }

  async findOne(id: string) {
    const production = await this.productionModel.findById(id, { _id: 1, name: 1, country: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!production)
      throw new HttpException({ code: StatusCode.PRODUCTION_NOT_FOUND, message: 'Production not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(ProductionDetails, production);
  }

  async update(id: string, updateProductionDto: UpdateProductionDto, authUser: AuthUserDto) {
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
    return plainToInstance(ProductionDetails, production.toObject());
  }

  async remove(id: string, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedProduction = await this.productionModel.findByIdAndDelete(id).lean().exec();
      if (!deletedProduction)
        throw new HttpException({ code: StatusCode.PRODUCTION_NOT_FOUND, message: 'Production not found' }, HttpStatus.NOT_FOUND);
      await Promise.all([
        this.mediaService.deleteProductionMedia(id, <any[]>deletedProduction.media, session),
        this.auditLogService.createLog(authUser._id, deletedProduction._id, Production.name, AuditLogType.PRODUCTION_DELETE)
      ]);
    });
  }

  findByName(name: string) {
    return this.productionModel.findOne({ name }).lean().exec();
  }

  async createMany(productions: any[], session?: ClientSession) {
    const createdProductions: LeanDocument<Production>[] = [];
    for (let i = 0; i < productions.length; i++) {
      const productionId = await createSnowFlakeId();
      const production = await this.productionModel.findOneAndUpdate(productions[i], { $setOnInsert: { _id: productionId } },
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
