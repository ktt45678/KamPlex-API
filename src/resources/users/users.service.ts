import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, LeanDocument, Model } from 'mongoose';
import { nanoid } from 'nanoid/async';
import { plainToInstance, plainToClassFromExist } from 'class-transformer';

import { User, UserDocument, UserAvatar } from '../../schemas';
import { AuthUserDto, UpdateUserDto } from './dto';
import { Avatar, User as UserEntity, UserDetails } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { HttpEmailService } from '../../common/modules/http-email/http-email.service';
import { AzureBlobService } from '../../common/modules/azure-blob/azure-blob.service';
import { PermissionsService } from '../../common/modules/permissions/permissions.service';
import { PaginateDto, Paginated } from '../roles';
import { StatusCode, AzureStorageContainer, SendgridTemplate, AuditLogType, MongooseConnection } from '../../enums';
import { MongooseAggregation, LookupOptions, createAzureStorageUrl, createAzureStorageProxyUrl, createSnowFlakeId, escapeRegExp, trimSlugFilename, AuditLogBuilder } from '../../utils';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name, MongooseConnection.DATABASE_A) private userModel: Model<UserDocument>,
    private authService: AuthService, private auditLogService: AuditLogService,
    private httpEmailService: HttpEmailService, private azureBlobService: AzureBlobService,
    private permissionsService: PermissionsService, private configService: ConfigService) { }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'username'];
    const fields = { _id: 1, username: 1, displayName: 1, roles: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { username: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const lookups: LookupOptions[] = [{
      from: 'roles',
      localField: 'roles',
      foreignField: '_id',
      as: 'roles',
      project: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 },
      sort: { position: 1 },
      isArray: true
    }];
    const [data] = await this.userModel.aggregate(aggregation.buildLookup(lookups)).exec();
    const users = data ? plainToClassFromExist(new Paginated<UserEntity>({ type: UserEntity }), data) : new Paginated<UserEntity>();
    return users;
  }

  async findOne(id: string, authUser: AuthUserDto) {
    let user: LeanDocument<User>;
    if (!authUser.isAnonymous && (authUser._id === id || authUser.hasPermission)) {
      user = await this.userModel.findById(id,
        { _id: 1, username: 1, email: 1, displayName: 1, birthdate: 1, roles: 1, createdAt: 1, verified: 1, banned: 1, lastActiveAt: 1, avatar: 1 })
        .populate({ path: 'roles', select: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }, options: { sort: { position: 1 } } })
        .lean().exec();
    } else {
      user = await this.userModel.findById(id,
        { _id: 1, username: 1, displayName: 1, roles: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 })
        .populate({ path: 'roles', select: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }, options: { sort: { position: 1 } } })
        .lean().exec();
    }
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(UserDetails, user);
  }

  async update(id: string, updateUserDto: UpdateUserDto, authUser: AuthUserDto) {
    if (authUser._id !== id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user' }, HttpStatus.FORBIDDEN);
    if (!Object.keys(updateUserDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const user = await this.userModel.findById(id).populate('roles', { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }).exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    if (updateUserDto.currentPassword != undefined) {
      const isValidPassword = await this.authService.comparePassword(updateUserDto.currentPassword, user.password);
      if (!isValidPassword)
        throw new HttpException({ code: StatusCode.INCORRECT_PASSWORD, message: 'Current password is incorrect' }, HttpStatus.BAD_REQUEST);
    }
    updateUserDto.displayName !== undefined && (user.displayName = updateUserDto.displayName);
    updateUserDto.birthdate != undefined && (user.birthdate = updateUserDto.birthdate);
    if (!updateUserDto.restoreAccount) {
      // Update password
      if (updateUserDto.password != undefined) {
        if (authUser._id !== id)
          throw new HttpException({ code: StatusCode.PASSWORD_UPDATE_RESTRICTED, message: 'Only the account owner can update the password' }, HttpStatus.FORBIDDEN);
        if (updateUserDto.currentPassword == undefined)
          throw new HttpException({ code: StatusCode.REQUIRE_PASSWORD, message: 'Current password is required to update password' }, HttpStatus.BAD_REQUEST);
        user.password = await this.authService.hashPassword(updateUserDto.password);
      }
    } else {
      // Restore account's password
      if (!authUser.hasPermission)
        throw new HttpException({ code: StatusCode.RESTORE_ACCOUNT_RESTRICTED, message: 'You do not have permission to restore this user' }, HttpStatus.FORBIDDEN);
      const [randomPassword, recoveryCode] = await Promise.all([nanoid(), nanoid()]);
      user.password = await this.authService.hashPassword(randomPassword);
      user.recoveryCode = recoveryCode;
    }
    const auditLog = new AuditLogBuilder(authUser._id, user._id, User.name, AuditLogType.USER_UPDATE);
    if (updateUserDto.banned != undefined && user.banned !== updateUserDto.banned && authUser.hasPermission) {
      const userPosition = this.permissionsService.getHighestRolePosition(authUser);
      const targetPosition = this.permissionsService.getHighestRolePosition(user);
      if (authUser._id === id || (targetPosition >= 0 && userPosition >= targetPosition))
        throw new HttpException({ code: StatusCode.BAN_USER_RESTRICTED, message: 'You do not have permission to ban or unban this user' }, HttpStatus.FORBIDDEN);
      auditLog.appendChange('banned', updateUserDto.banned, user.banned);
      user.banned = updateUserDto.banned;
    }
    if (updateUserDto.username != undefined && updateUserDto.username !== user.username) {
      if (authUser._id === id && updateUserDto.currentPassword == undefined)
        throw new HttpException({ code: StatusCode.REQUIRE_PASSWORD, message: 'Current password is required to update username' }, HttpStatus.BAD_REQUEST);
      const checkNewUsername = await this.authService.findByUsername(updateUserDto.username);
      if (checkNewUsername)
        throw new HttpException({ code: StatusCode.EMAIL_EXIST, message: 'Username has already been used' }, HttpStatus.BAD_REQUEST);
      user.username = updateUserDto.username;
    }
    const oldEmail = user.email;
    if (updateUserDto.email != undefined && updateUserDto.email !== user.email) {
      if (authUser._id === id && updateUserDto.currentPassword == undefined)
        throw new HttpException({ code: StatusCode.REQUIRE_PASSWORD, message: 'Current password is required to update email' }, HttpStatus.BAD_REQUEST);
      const checkNewEmail = await this.authService.findByEmail(updateUserDto.email);
      if (checkNewEmail)
        throw new HttpException({ code: StatusCode.EMAIL_EXIST, message: 'Email has already been used' }, HttpStatus.BAD_REQUEST);
      user.email = updateUserDto.email;
      user.verified = false;
      const activationCode = await nanoid();
      user.activationCode = activationCode;
    }
    const newUser = await user.save();
    if (oldEmail !== newUser.email) {
      await Promise.all([
        this.httpEmailService.sendEmailSendGrid(newUser.email, newUser.username, 'Confirm your new email',
          SendgridTemplate.UPDATE_EMAIL, {
          recipient_name: newUser.username,
          button_url: `${this.configService.get('WEBSITE_URL')}/confirm-email?code=${newUser.activationCode}`
        }),
        this.httpEmailService.sendEmailSendGrid(oldEmail, newUser.username, 'Your email has been changed',
          SendgridTemplate.EMAIL_CHANGED, {
          recipient_name: newUser.username,
          new_email: newUser.email
        })
      ]);
    }
    const result: any = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      displayName: newUser.displayName,
      birthdate: newUser.birthdate,
      roles: newUser.roles,
      createdAt: newUser.createdAt,
      verified: newUser.verified,
      banned: newUser.banned,
      lastActiveAt: newUser.lastActiveAt
    };
    if (authUser._id === id) {
      if (oldEmail !== user.email || updateUserDto.password != undefined) {
        // Create new jwt tokens for user
        result.auth = await this.authService.createJwtToken(newUser);;
      }
    } else if (authUser.hasPermission) {
      // Send email to notify user
      if (updateUserDto.restoreAccount) {
        await this.httpEmailService.sendEmailSendGrid(newUser.email, newUser.username, 'We have restored your account',
          SendgridTemplate.ACCOUNT_MANAGE_RESTORED, {
          recipient_name: newUser.username,
          username: newUser.username,
          email: newUser.email,
          display_name: newUser.displayName ?? 'Not set',
          birthdate: `${newUser.birthdate.day}/${newUser.birthdate.month}/${newUser.birthdate.year}`,
          button_url: `${this.configService.get('WEBSITE_URL')}/reset-password?code=${newUser.recoveryCode}`
        });
      }
      else {
        await this.httpEmailService.sendEmailSendGrid(newUser.email, newUser.username, 'We have updated your account',
          SendgridTemplate.ACCOUNT_MANAGE_UPDATED, {
          recipient_name: newUser.username,
          username: updateUserDto.username ?? '(Not changed)',
          email: updateUserDto.email ?? '(Not changed)',
          display_name: updateUserDto.displayName ?? '(Not changed)',
          birthdate: updateUserDto.birthdate != undefined ? `${updateUserDto.birthdate.day}/${updateUserDto.birthdate.month}/${updateUserDto.birthdate.year}` : '(Not changed)'
        });
      }
      await this.auditLogService.createLogFromBuilder(auditLog);
    }
    await this.authService.clearCachedAuthUser(id);
    return result;
  }

  async findOneAvatar(id: string) {
    const user = await this.userModel.findById(id, { avatar: 1 }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    if (!user.avatar)
      return;
    const uploadedAvatar: Avatar = {
      avatarUrl: createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${user.avatar._id}/${user.avatar.name}`),
      thumbnailAvatarUrl: createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${user.avatar._id}/${user.avatar.name}`, 250)
    };
    return uploadedAvatar;
  }

  async updateAvatar(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user avatar' }, HttpStatus.FORBIDDEN);
    const avatarId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveTo = `${avatarId}/${trimmedFilename}`;
    await this.azureBlobService.upload(AzureStorageContainer.AVATARS, saveTo, file.filepath, file.mimetype);
    const avatar = new UserAvatar();
    avatar._id = avatarId;
    avatar.name = trimmedFilename;
    avatar.color = file.color;
    avatar.mimeType = file.mimetype;
    const session = await this.userModel.startSession();
    try {
      await session.withTransaction(async () => {
        const user = await this.userModel.findByIdAndUpdate(id, { avatar }, { session }).lean();
        if (!user)
          throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
        // Remove old avatar
        if (user.avatar)
          await this.azureBlobService.delete(AzureStorageContainer.AVATARS, `${user.avatar._id}/${user.avatar.name}`);
      });
    } catch (e) {
      // Try to rollback
      await this.azureBlobService.delete(AzureStorageContainer.AVATARS, `${avatar._id}/${avatar.name}`);
      throw e;
    }
    const uploadedAvatar: Avatar = {
      avatarUrl: createAzureStorageUrl(AzureStorageContainer.AVATARS, `${avatar._id}/${avatar.name}`),
      thumbnailAvatarUrl: createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${avatar._id}/${avatar.name}`, 250)
    };
    return uploadedAvatar;
  }

  async deleteAvatar(id: string, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to delete this user avatar' }, HttpStatus.FORBIDDEN);
    const session = await this.userModel.startSession();
    await session.withTransaction(async () => {
      const user = await this.userModel.findByIdAndUpdate(id, { $unset: { avatar: 1 } }).lean().session(session);
      if (!user)
        throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
      if (!user.avatar)
        throw new HttpException({ code: StatusCode.AVATAR_NOT_FOUND, message: 'Avatar not found' }, HttpStatus.NOT_FOUND);
      await this.azureBlobService.delete(AzureStorageContainer.AVATARS, `${user.avatar._id}/${user.avatar.name}`);
    });
  }

  countByIds(ids: string[]) {
    return this.userModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  async updateRoleUsers(id: string, newUsers: any[], oldUsers: any[], session: ClientSession) {
    if (newUsers.length)
      await this.userModel.updateMany({ _id: { $in: newUsers } }, { $push: { roles: <any>id } }).session(session);
    if (oldUsers.length)
      await this.userModel.updateMany({ _id: { $in: oldUsers } }, { $pull: { roles: <any>id } }).session(session);
  }

  addRoleUsers(id: string, users: any[]) {
    if (users.length)
      return this.userModel.updateMany({ _id: { $in: users } }, { $push: { roles: <any>id } }).exec();
  }

  deleteRoleUsers(id: string, users: any[], session: ClientSession) {
    if (users.length)
      return this.userModel.updateMany({ _id: { $in: users } }, { $pull: { roles: <any>id } }).session(session);
  }
}
