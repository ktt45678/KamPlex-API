import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Model } from 'mongoose';

import { Role, RoleDocument } from '../../schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) { }

  async create(createRoleDto: CreateRoleDto) {
    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  findAll() {
    return this.roleModel.find({}).lean().exec();
  }

  findOne(id: string) {
    return this.roleModel.findById(id).lean().exec();
  }

  update(id: string, updateRoleDto: UpdateRoleDto) {
    return this.roleModel.findByIdAndUpdate(id, updateRoleDto).lean().exec();
  }

  remove(id: string) {
    return this.roleModel.findByIdAndDelete(id).lean().exec();
  }
}
