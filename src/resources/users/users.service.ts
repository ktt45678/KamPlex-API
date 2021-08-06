import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user)
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async isUsernameExist(username: string) {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user)
      return false;
    return true;
  }

  async isEmailExist(email: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user)
      return false;
    return true;
  }
}
