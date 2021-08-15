import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginateDto } from './dto/paginate.dto';
import { Role, RoleDocument } from '../../schemas/role.schema';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { Paginated } from './entities/paginated.entity';
import { StatusCode } from '../../enums/status-code.enum';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) { }

  async create(createRoleDto: CreateRoleDto) {
    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'name'];
    const fields = { _id: 1, name: 1, color: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const aggr: any[] = await this.roleModel.aggregate(aggregation.build()).exec();
    return aggr.shift() || new Paginated({});
  }

  findOne(id: string) {
    return this.roleModel.findById(id, { users: 0 }).lean().exec();
  }

  async findAllUsers(id: string, paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'username'];
    const fields = { _id: 1, username: 1, displayName: 1, createdAt: 1, lastActiveAt: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { username: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const lookup: LookupOptions = { from: 'users', localField: 'users', foreignField: '_id', as: 'users' };
    const aggr: any[] = await this.roleModel.aggregate(aggregation.buildLookup(id, lookup)).exec();
    return aggr.shift() || new Paginated({});
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleModel.findByIdAndUpdate(id, updateRoleDto).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    return { message: 'Role has been updated' };
  }

  async remove(id: string) {
    const role = await this.roleModel.findByIdAndDelete(id).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    return { message: 'Role has been deleted' };
  }
}