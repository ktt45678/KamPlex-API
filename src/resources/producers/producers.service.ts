import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Connection } from 'mongoose';
import { plainToClass } from 'class-transformer';

import { Producer, ProducerDocument } from '../../schemas/producer.schema';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { CreateProducerDto } from './dto/create-producer.dto';
import { UpdateProducerDto } from './dto/update-producer.dto';
import { PaginateDto } from '../roles/dto/paginate.dto';
import { ProducerDetails } from './entities/producer-details.entity';
import { Paginated } from '../roles/entities/paginated.entity';
import { MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { MediaService } from '../media/media.service';

@Injectable()
export class ProducersService {
  constructor(@InjectModel(Producer.name) private producerModel: Model<ProducerDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @Inject(forwardRef(() => MediaService)) private mediaService: MediaService) { }

  async create(createProducerDto: CreateProducerDto, authUser: AuthUserDto) {
    const producer = new this.producerModel();
    producer.name = createProducerDto.name;
    producer.country = createProducerDto.country;
    const newProducer = await producer.save();
    return newProducer.toObject();
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'name', 'country'];
    const fields = { _id: 1, name: 1, country: 1, logoUrl: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.producerModel.aggregate(aggregation.build()).exec();
    return data ? data : new Paginated();
  }

  async findOne(id: string) {
    const producer = await this.producerModel.findById(id, { _id: 1, name: 1, country: 1, logoUrl: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    if (!producer)
      throw new HttpException({ code: StatusCode.PRODUCER_NOT_FOUND, message: 'Producer not found' }, HttpStatus.NOT_FOUND);
    return plainToClass(ProducerDetails, producer);
  }

  async update(id: string, updateProducerDto: UpdateProducerDto) {
    if (!Object.keys(updateProducerDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const { name, country } = updateProducerDto;
    const producer = await this.producerModel.findById(id).exec();
    if (!producer)
      throw new HttpException({ code: StatusCode.PRODUCER_NOT_FOUND, message: 'Producer not found' }, HttpStatus.NOT_FOUND);
    name != undefined && (producer.name = name);
    country != undefined && (producer.country = country);
    await producer.save();
    return plainToClass(ProducerDetails, producer.toObject());
  }

  async remove(id: string) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedProducer = await this.producerModel.findByIdAndDelete(id).lean().exec();
      if (!deletedProducer)
        throw new HttpException({ code: StatusCode.PRODUCER_NOT_FOUND, message: 'Producer not found' }, HttpStatus.NOT_FOUND);
      await this.mediaService.deleteProducerMedia(id, <any[]>deletedProducer.media, session);
    });
  }

  findByName(name: string) {
    return this.producerModel.findOne({ name }).lean().exec();
  }

  countByIds(ids: string[]) {
    return this.producerModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  addMediaProducers(media: string, ids: string[], session?: ClientSession) {
    if (ids.length)
      return this.producerModel.updateMany({ _id: { $in: ids } }, { $push: { media } }, { session });
  }

  deleteMediaProducers(media: string, ids: string[], session?: ClientSession) {
    if (ids.length)
      return this.producerModel.updateMany({ _id: { $in: ids } }, { $pull: { media } }, { session });
  }
}
