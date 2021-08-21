import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateDto } from './dto/paginate.dto';
import { UpdateRoleUsersDto } from './dto/update-role-users.dto';
import { Role, RoleDocument } from '../../schemas/role.schema';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { Paginated } from './entities/paginated.entity';
import { Avatar } from '../users/entities/avatar.enity';
import { StatusCode } from '../../enums/status-code.enum';
import { ImagekitTransform } from '../../enums/imagekit-transform.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../../schemas/user.schema';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectConnection() private mongooseConnection: Connection, private usersService: UsersService, private authService: AuthService) { }

  async create(createRoleDto: CreateRoleDto) {
    const session = await this.roleModel.startSession();
    session.startTransaction();
    try {
      const latestRole = await this.roleModel.findOne().sort({ position: -1 }).lean().session(session);
      const newPosition = typeof latestRole?.position === 'number' ? latestRole.position + 1 : 1;
      const roleData = { ...createRoleDto, position: newPosition };
      const role = new this.roleModel(roleData);
      const newRole = await role.save({ session });
      await session.commitTransaction();
      return newRole.toObject();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'name', 'position'];
    const fields = { _id: 1, name: 1, color: 1, position: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const aggr: any[] = await this.roleModel.aggregate(aggregation.build()).exec();
    return aggr.shift() || new Paginated({});
  }

  findOne(id: string) {
    return this.roleModel.findById(id, { users: 0, __v: 0 }).lean().exec();
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, authUser: AuthUserDto) {
    if (!Object.keys(updateRoleDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const role = await this.roleModel.findById(id).exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'You do not have permission to update this role' }, HttpStatus.FORBIDDEN);
    if (updateRoleDto.position !== undefined) {
      const latestRole = await this.roleModel.findOne().sort({ position: -1 }).lean().exec();
      const maxRolePosition = this.getMaxRolePosition(authUser);
      if (maxRolePosition >= 0 && (maxRolePosition >= updateRoleDto.position || updateRoleDto.position > latestRole.position))
        throw new HttpException({ code: StatusCode.ROLE_INVALID_POSITION, message: 'You cannot move this role to the specified position' }, HttpStatus.FORBIDDEN);
      const swapRole = await this.roleModel.findOne({ position: updateRoleDto.position }).exec();
      if (swapRole) {
        const session = await this.roleModel.startSession();
        session.startTransaction();
        try {
          // Swap positions
          swapRole.position = role.position;
          role.set(updateRoleDto);
          const [_, newRole] = await Promise.all([
            swapRole.save({ session }),
            role.save({ session })
          ]);
          await this.authService.clearCachedAuthUsers(<any[]>role.users);
          await session.commitTransaction();
          const roleLean = newRole.toObject();
          delete roleLean.users;
          return roleLean;
        } catch (e) {
          await session.abortTransaction();
          throw e;
        } finally {
          session.endSession();
        }
      }
    }
    role.set(updateRoleDto);
    const newRole = await role.save();
    await this.authService.clearCachedAuthUsers(<any[]>role.users);
    const roleLean = newRole.toObject();
    delete roleLean.users;
    return roleLean;
  }

  async remove(id: string, authUser: AuthUserDto) {
    const role = await this.roleModel.findById(id).select({ users: 0 }).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'You do not have permission to delete this role' }, HttpStatus.FORBIDDEN);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedRole = await this.roleModel.findByIdAndDelete(id).lean().session(session);
      // Remove all references
      await this.usersService.deleteRoleUsers(deletedRole._id, deletedRole.users, session);
      await this.authService.clearCachedAuthUsers(<any[]>role.users);
    });
    return null;
  }

  canEditRole(authUser: AuthUserDto, targetRole: Role) {
    if (authUser.isOwner)
      return true;
    if (!authUser.roles?.length || !targetRole)
      return false;
    const role = authUser.roles[0];
    // Cannot edit higher position role
    if (role.position >= targetRole.position)
      return false;
    return true;
  }

  getMaxRolePosition(authUser: AuthUserDto) {
    if (authUser.isOwner)
      return 0;
    if (!authUser.roles?.length)
      return -1;
    return authUser.roles[0].position;
  }

  async findAllUsers(id: string, paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'username'];
    const fields = { _id: 1, username: 1, displayName: 1, isBanned: 1, createdAt: 1, lastActiveAt: 1, avatar: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { username: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const lookup: LookupOptions = { from: 'users', localField: 'users', foreignField: '_id', as: 'users' };
    const aggr: any[] = await this.roleModel.aggregate(aggregation.buildLookup(id, lookup)).exec();
    const users: Paginated<User & Avatar> = aggr.shift() || new Paginated({});
    let i = users.results.length;
    while (i--) {
      users.results[i].avatarUrl = this.usersService.createAvatarUrl(users.results[i].avatar, ImagekitTransform.MEDIUM);
      users.results[i].thumbnailAvatarUrl = this.usersService.createAvatarUrl(users.results[i].avatar, ImagekitTransform.THUMBNAIL);
      delete users.results[i].avatar;
    }
    return users;
  }

  async updateRoleUsers(id: string, updateRoleUsersDto: UpdateRoleUsersDto, authUser: AuthUserDto) {
    const role = await this.roleModel.findById(id).select({ users: 0 }).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'The role you are trying to update is higher than your roles' }, HttpStatus.FORBIDDEN);
    const { userIds } = updateRoleUsersDto;
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const oldRole = await this.roleModel.findByIdAndUpdate(id, { users: <any[]>userIds }).lean().session(session);
      const roleUsers: string[] = <any[]>oldRole.users || [];
      const newUsers = userIds.filter(e => !roleUsers.includes(e));
      const oldUsers = roleUsers.filter(e => !userIds.includes(e));
      await this.usersService.updateRoleUsers(id, newUsers, oldUsers, session);
      await this.authService.clearCachedAuthUsers([...oldUsers, ...newUsers]);
    });
    return { users: userIds };
  }
}