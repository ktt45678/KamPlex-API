import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, LeanDocument } from 'mongoose';
import { plainToClassFromExist } from 'class-transformer';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateDto } from './dto/paginate.dto';
import { UpdateRoleUsersDto } from './dto/update-role-users.dto';
import { Role, RoleDocument } from '../../schemas/role.schema';
import { LookupOptions, MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { Paginated } from './entities/paginated.entity';
import { StatusCode } from '../../enums/status-code.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { RoleUsers } from './entities/role-users.entity';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private usersService: UsersService, private authService: AuthService) { }

  async create(createRoleDto: CreateRoleDto) {
    const role = new this.roleModel(createRoleDto);
    const latestRole = await this.roleModel.findOne({}).sort({ position: -1 }).lean().exec();
    role.position = latestRole?.position ? latestRole.position + 1 : 1;
    const newRole = await role.save();
    return newRole.toObject();
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'name', 'position'];
    const fields = { _id: 1, name: 1, color: 1, position: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.roleModel.aggregate(aggregation.build()).exec();
    return data ? data : new Paginated();
  }

  async findOne(id: string, authUser: AuthUserDto) {
    let role: LeanDocument<Role>;
    if (authUser.hasPermission)
      role = await this.roleModel.findById(id, { _id: 1, name: 1, color: 1, permissions: 1, position: 1, createdAt: 1, updatedAt: 1 }).lean().exec();
    else
      role = await this.roleModel.findById(id, { _id: 1, name: 1, color: 1 }).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, authUser: AuthUserDto) {
    if (!Object.keys(updateRoleDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const role = await this.roleModel.findById(id).exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'You do not have permission to update this role' }, HttpStatus.FORBIDDEN);
    updateRoleDto.name != undefined && (role.name = updateRoleDto.name);
    updateRoleDto.color !== undefined && (role.color = updateRoleDto.color);
    if (updateRoleDto.permissions != undefined && updateRoleDto.permissions !== role.permissions)
      if (!this.canEditPermissions(authUser, role.permissions, updateRoleDto.permissions))
        throw new HttpException({ code: StatusCode.PERMISSION_RESTRICTED, message: 'You cannot edit permissions that you don\'t have' }, HttpStatus.FORBIDDEN);
      else
        role.permissions = updateRoleDto.permissions;
    if (updateRoleDto.position != undefined && updateRoleDto.position !== role.position) {
      const latestPosition = await this.roleModel.findOne({}).sort({ position: -1 }).lean().exec();
      const maxRolePosition = this.getMaxRolePosition(authUser);
      if (maxRolePosition >= 0 && (maxRolePosition >= updateRoleDto.position || updateRoleDto.position > latestPosition.position))
        throw new HttpException({ code: StatusCode.ROLE_INVALID_POSITION, message: 'You cannot move this role to the specified position' }, HttpStatus.FORBIDDEN);
      const swapRole = await this.roleModel.findOne({ position: updateRoleDto.position }).exec();
      if (swapRole) {
        const session = await this.roleModel.startSession();
        session.startTransaction();
        try {
          // Swap positions
          swapRole.position = role.position;
          role.position = updateRoleDto.position;
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
      } else {
        role.position = updateRoleDto.position;
      }
    }
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
      const deletedRole = await this.roleModel.findByIdAndDelete(id, { session }).lean();
      // Remove all references and caches
      await Promise.all([
        this.usersService.deleteRoleUsers(deletedRole._id, deletedRole.users, session),
        this.authService.clearCachedAuthUsers(<any[]>role.users)
      ]);
    });
  }

  canEditRole(authUser: AuthUserDto, targetRole: Role | LeanDocument<Role>) {
    if (authUser.isOwner)
      return true;
    if (!authUser.roles?.length)
      return false;
    const minPosition = Math.min.apply(Math, authUser.roles.map(o => o.position));
    // Cannot edit higher position role
    if (minPosition >= targetRole.position)
      return false;
    return true;
  }

  canEditPermissions(authUser: AuthUserDto, oldPermissions: number, newPermissions: number) {
    if (authUser.isOwner)
      return true;
    if (!authUser.granted?.length)
      return false;
    for (let i = 0; i < authUser.granted.length; i++) {
      if (authUser.granted[i] & oldPermissions)
        oldPermissions = oldPermissions ^ authUser.granted[i];
      if (authUser.granted[i] & newPermissions)
        newPermissions = newPermissions ^ authUser.granted[i];
      if (newPermissions === 0 && oldPermissions === 0)
        return true;
    }
    return false;
  }

  getMaxRolePosition(authUser: AuthUserDto) {
    if (authUser.isOwner)
      return 0;
    if (!authUser.roles?.length)
      return -1;
    return authUser.roles[0].position;
  }

  async findAllUsers(id: string, paginateDto: PaginateDto) {
    // Limit sorting fields
    const sortEnum = ['_id', 'username'];
    // Projection
    const fields = { _id: 1, username: 1, displayName: 1, banned: 1, createdAt: 1, lastActiveAt: 1, avatar: 1 };
    const { page, limit, sort, search } = paginateDto;
    // Config filters
    const filters = search ? { username: { $regex: search, $options: 'i' } } : {};
    // Aggregation query builder
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    // Aggregation with population
    const lookup: LookupOptions = { from: 'users', localField: 'users', foreignField: '_id', as: 'users' };
    const [data]: [Paginated<RoleUsers>] = await this.roleModel.aggregate(aggregation.buildLookupOnly(id, lookup)).exec();
    // Convert to class for serialization
    const users = data ? plainToClassFromExist(new Paginated<RoleUsers>({ type: RoleUsers }), data) : new Paginated<RoleUsers>();
    return users;
  }

  async updateRoleUsers(id: string, updateRoleUsersDto: UpdateRoleUsersDto, authUser: AuthUserDto) {
    const role = await this.roleModel.findById(id).select({ users: 0 }).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'The role you are trying to update is higher than your roles' }, HttpStatus.FORBIDDEN);
    const { userIds } = updateRoleUsersDto;
    if (userIds.length) {
      const userCount = await this.usersService.countByIds(userIds);
      if (userCount !== userIds.length)
        throw new HttpException({ code: StatusCode.USERS_NOT_FOUND, message: 'Cannot find all the required users' }, HttpStatus.NOT_FOUND);
    }
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