import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { plainToClassFromExist } from 'class-transformer';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { PaginateDto } from './dto/paginate.dto';
import { UpdateRoleUsersDto } from './dto/update-role-users.dto';
import { Role, RoleDocument } from '../../schemas/role.schema';
import { LookupOptions, MongooseAggregation, createSnowFlakeIdAsync, escapeRegExp } from '../../utils';
import { Paginated } from './entities/paginated.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PermissionsService } from '../../common/permissions/permissions.service';
import { RoleUsers } from './entities/role-users.entity';
import { StatusCode, MongooseConnection, AuditLogType } from '../../enums';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    private usersService: UsersService, private authService: AuthService, private auditLogService: AuditLogService,
    private permissionsService: PermissionsService) { }

  async create(createRoleDto: CreateRoleDto, authUser: AuthUserDto) {
    const role = new this.roleModel(createRoleDto);
    role._id = await createSnowFlakeIdAsync();
    const latestRole = await this.roleModel.findOne({}).sort({ position: -1 }).lean().exec();
    role.position = latestRole?.position ? latestRole.position + 1 : 1;
    await Promise.all([
      role.save(),
      this.auditLogService.createLog(authUser._id, role._id, Role.name, AuditLogType.ROLE_CREATE)
    ]);
    return role.toObject();
  }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'position'];
    const fields = { _id: 1, name: 1, color: 1, permissions: 1, position: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { name: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const [data] = await this.roleModel.aggregate(aggregation.build()).exec();
    return data ? data : new Paginated();
  }

  async findOne(id: string) {
    const role = await this.roleModel.findById(id, { _id: 1, name: 1, color: 1, permissions: 1, position: 1, createdAt: 1, updatedAt: 1 })
      .lean().exec();
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
    if (!this.permissionsService.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'You do not have permission to update this role' }, HttpStatus.FORBIDDEN);
    updateRoleDto.name != undefined && (role.name = updateRoleDto.name);
    updateRoleDto.color !== undefined && (role.color = updateRoleDto.color);
    if (updateRoleDto.permissions != undefined && updateRoleDto.permissions !== role.permissions)
      if (!this.permissionsService.canEditPermissions(authUser, role.permissions, updateRoleDto.permissions))
        throw new HttpException({ code: StatusCode.PERMISSION_RESTRICTED, message: 'You cannot edit permissions that you don\'t have' }, HttpStatus.FORBIDDEN);
      else
        role.permissions = updateRoleDto.permissions;
    if (updateRoleDto.position != undefined && updateRoleDto.position !== role.position) {
      const latestPosition = await this.roleModel.findOne({}).sort({ position: -1 }).lean().exec();
      const highestRolePosition = this.permissionsService.getHighestRolePosition(authUser);
      if (highestRolePosition >= 0 && (highestRolePosition >= updateRoleDto.position || updateRoleDto.position > latestPosition.position))
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
    await Promise.all([
      role.save(),
      this.auditLogService.createLog(authUser._id, role._id, Role.name, AuditLogType.ROLE_UPDATE)
    ]);
    await this.authService.clearCachedAuthUsers(<any[]>role.users);
    const roleLean = role.toObject();
    roleLean.users = undefined;
    return roleLean;
  }

  async remove(id: string, authUser: AuthUserDto) {
    const role = await this.roleModel.findById(id).select({ users: 0 }).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.permissionsService.canEditRole(authUser, role))
      throw new HttpException({ code: StatusCode.ROLE_PRIORITY, message: 'You do not have permission to delete this role' }, HttpStatus.FORBIDDEN);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const deletedRole = await this.roleModel.findByIdAndDelete(id, { session }).lean();
      // Remove all references and caches
      await Promise.all([
        this.usersService.deleteRoleUsers(deletedRole._id, deletedRole.users, session),
        this.authService.clearCachedAuthUsers(<any[]>role.users),
        this.auditLogService.createLog(authUser._id, role._id, Role.name, AuditLogType.ROLE_DELETE)
      ]);
    });
  }

  async findAllUsers(id: string, paginateDto: PaginateDto) {
    // Limit sorting fields
    const sortEnum = ['_id', 'username'];
    // Projection
    const fields = { _id: 1, username: 1, displayName: 1, banned: 1, createdAt: 1, lastActiveAt: 1, avatar: 1 };
    const { page, limit, sort, search } = paginateDto;
    // Config filters
    const filters = search ? { username: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    // Aggregation query builder
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    // Aggregation with population
    const lookup: LookupOptions = { from: 'users', localField: 'users', foreignField: '_id', as: 'users' };
    const [data] = await this.roleModel.aggregate(aggregation.buildLookupOnly(id, lookup)).exec();
    // Convert to class for serialization
    const users = data ? plainToClassFromExist(new Paginated<RoleUsers>({ type: RoleUsers }), data) : new Paginated<RoleUsers>();
    return users;
  }

  async updateRoleUsers(id: string, updateRoleUsersDto: UpdateRoleUsersDto, authUser: AuthUserDto) {
    const role = await this.roleModel.findById(id).select({ users: 0 }).lean().exec();
    if (!role)
      throw new HttpException({ code: StatusCode.ROLE_NOT_FOUND, message: 'Role not found' }, HttpStatus.NOT_FOUND);
    if (!this.permissionsService.canEditRole(authUser, role))
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
      if (newUsers.length)
        await this.auditLogService.createLog(authUser._id, role._id, Role.name, AuditLogType.ROLE_MEMBER_ADD)
      if (oldUsers.length)
        await this.auditLogService.createLog(authUser._id, role._id, Role.name, AuditLogType.ROLE_MEMBER_REMOVE)
    });
    return { users: userIds };
  }
}