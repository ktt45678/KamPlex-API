import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClientSession, Model } from 'mongoose';
import { nanoid } from 'nanoid/async';

import { User, UserDocument } from '../../schemas/user.schema';
import { UserAvatar, UserAvatarDocument } from '../../schemas/user-avatar.schema';
import { AuthUserDto } from './dto/auth-user.dto';
import { StatusCode } from 'src/enums/status-code.enum';
import { MailgunTemplate } from '../../enums/mailgun-template.enum';
import { PaginateDto } from '../roles/dto/paginate.dto';
import { Paginated } from '../roles/entities/paginated.entity';
import { Avatar } from '../users/entities/avatar.enity';
import { MongooseAggregation } from '../../utils/mongo-aggregation.util';
import { AuthService } from '../auth/auth.service';
import { HttpEmailService } from '../../common/http-email/http-email.service';
import { ImagekitService } from '../../common/imagekit/imagekit.service';
import { CloudStorage } from '../../enums/cloud-storage.enum';
import { UserFileType } from '../../enums/user-file-type.enum';
import { ImagekitTransform } from '../../enums/imagekit-transform.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, @InjectModel(UserAvatar.name) private userAvatarModel: Model<UserAvatarDocument>,
    private authService: AuthService, private httpEmailService: HttpEmailService, private imagekitService: ImagekitService) { }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'username'];
    const fields = { _id: 1, username: 1, displayName: 1, createdAt: 1, isBanned: 1, lastActiveAt: 1, avatar: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { username: { $regex: search, $options: 'i' } } : {};
    const aggregation = new MongooseAggregation({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const aggr: any[] = await this.userModel.aggregate(aggregation.build()).exec();
    const users: Paginated<User & Avatar> = aggr.shift() || new Paginated({});
    let i = users.results.length;
    while (i--) {
      users.results[i].avatarUrl = this.createAvatarUrl(users.results[i].avatar, ImagekitTransform.MEDIUM);
      users.results[i].thumbnailAvatarUrl = this.createAvatarUrl(users.results[i].avatar, ImagekitTransform.THUMBNAIL);
      delete users.results[i].avatar;
    }
    return users;
  }

  async findOne(id: string, authUser: AuthUserDto) {
    let user: User;
    if (!authUser.isAnonymous && (authUser._id === id || authUser.hasPermission)) {
      user = await this.userModel.findById(id,
        { _id: 1, username: 1, email: 1, displayName: 1, birthdate: 1, roles: 1, createdAt: 1, isVerified: 1, isBanned: 1, lastActiveAt: 1, avatar: 1 }
      ).populate('roles', { _id: 1, name: 1, color: 1 }).lean().exec();
    } else {
      user = await this.userModel.findById(id,
        { _id: 1, username: 1, displayName: 1, roles: 1, createdAt: 1, isBanned: 1, lastActiveAt: 1, avatar: 1 }
      ).populate('roles', { _id: 1, name: 1, color: 1 }).lean().exec();
    }
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    const avatar: Avatar = {
      avatarUrl: this.createAvatarUrl(user.avatar, ImagekitTransform.MEDIUM),
      thumbnailAvatarUrl: this.createAvatarUrl(user.avatar, ImagekitTransform.THUMBNAIL)
    };
    delete user.avatar;
    const userWithAvatar: User & Avatar = { ...user, ...avatar };
    return userWithAvatar;
  }

  async update(id: string, updateUserDto: UpdateUserDto, authUser: AuthUserDto) {
    if (authUser._id !== id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user' }, HttpStatus.FORBIDDEN);
    if (!Object.keys(updateUserDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const user = await this.userModel.findById(id).exec();
    if (updateUserDto.displayName !== undefined && updateUserDto.displayName !== user.displayName)
      user.displayName = updateUserDto.displayName;
    if (updateUserDto.birthdate !== undefined && updateUserDto.birthdate !== user.birthdate)
      user.birthdate = updateUserDto.birthdate;
    if (!updateUserDto.restoreAccount) {
      // Update password
      if (updateUserDto.password !== undefined) {
        if (authUser._id !== id)
          throw new HttpException({ code: StatusCode.PASSWORD_UPDATE_RESTRICTED, message: 'Only the account owner can update the password' }, HttpStatus.FORBIDDEN);
        user.password = await this.authService.hashPassword(updateUserDto.password);
      }
    }
    else {
      // Restore account's password
      if (!authUser.hasPermission)
        throw new HttpException({ code: StatusCode.RESTORE_ACCOUNT_RESTRICTED, message: 'You do not have permission to restore this user' }, HttpStatus.FORBIDDEN);
      const [randomPassword, recoveryCode] = await Promise.all([nanoid(), nanoid()]);
      user.password = await this.authService.hashPassword(randomPassword);
      user.codes.recoveryCode = recoveryCode;
      user.markModified('codes');
    }
    if (updateUserDto.username !== undefined) {
      if (authUser._id === id && updateUserDto.password === undefined)
        throw new HttpException({ code: StatusCode.REQUIRE_PASSWORD, message: 'Password is required to update username' }, HttpStatus.BAD_REQUEST);
      user.username = updateUserDto.username;
    }
    const oldEmail = user.email;
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
      user.isVerified = false;
      const activationCode = await nanoid();
      user.codes.activationCode = activationCode;
      user.markModified('codes');
    }
    const newUser = await user.save();
    if (oldEmail !== newUser.email) {
      await Promise.all([
        this.httpEmailService.sendEmailMailgun(newUser.email, newUser.username, 'Confirm your new email', MailgunTemplate.UPDATE_EMAIL, {
          recipient_name: newUser.username,
          button_url: `${process.env.WEBSITE_URL}/confirm-email?code=${newUser.codes.activationCode}`
        }),
        this.httpEmailService.sendEmailMailgun(oldEmail, newUser.username, 'Your email has been changed', MailgunTemplate.EMAIL_CHANGED, {
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
      createdAt: newUser.createdAt,
      isVerified: newUser.isVerified,
      isBanned: newUser.isBanned,
      lastActiveAt: newUser.lastActiveAt
    };
    if (authUser._id === id) {
      if (updateUserDto.email !== undefined || updateUserDto.password !== undefined) {
        // Create new jwt tokens for user
        const tokens = await this.authService.createJwtToken(newUser);
        result.auth = tokens;
      }
    } else if (authUser.hasPermission) {
      // Send email to notify user
      if (!updateUserDto.restoreAccount) {
        await this.httpEmailService.sendEmailMailgun(newUser.email, newUser.username, 'Your account has been updated by the system', MailgunTemplate.ACCOUNT_MANAGE_UPDATED, {
          recipient_name: newUser.username,
          username: updateUserDto.username ?? '(Unchanged)',
          email: updateUserDto.email ?? '(Unchanged)',
          display_name: updateUserDto.displayName ?? '(Unchanged)',
          birthdate: updateUserDto.birthdate?.toISOString().split('T')[0] ?? '(Unchanged)'
        });
      }
      else {
        await this.httpEmailService.sendEmailMailgun(newUser.email, newUser.username, 'Your account has been restored by the system', MailgunTemplate.ACCOUNT_MANAGE_RESTORED, {
          recipient_name: newUser.username,
          username: newUser.username,
          email: newUser.email,
          display_name: newUser.displayName,
          birthdate: newUser.birthdate.toISOString().split('T')[0],
          button_url: `${process.env.WEBSITE_URL}/reset-password?code=${newUser.codes.recoveryCode}`
        });
      }
    }
    await this.authService.clearCachedAuthUser(id);
    return result;
  }

  async findOneAvatar(id: string) {
    const user = await this.userModel.findById(id, { avatar: 1 }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    const uploadedAvatar: Avatar = {
      avatarUrl: this.createAvatarUrl(user.avatar, ImagekitTransform.MEDIUM),
      thumbnailAvatarUrl: this.createAvatarUrl(user.avatar, ImagekitTransform.THUMBNAIL)
    };
    return uploadedAvatar;
  }

  async updateAvatar(id: string, file: Storage.MultipartFile, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user avatar' }, HttpStatus.FORBIDDEN);
    const avatar = new this.userAvatarModel({
      storage: CloudStorage.IMAGEKIT,
      name: file.filename,
      mimeType: file.detectedMimetype || file.mimetype
    });
    const response = await this.imagekitService.upload(file.filepath, file.filename, `${UserFileType.AVATAR}/${avatar._id}`);
    avatar.size = response.size;
    const session = await this.userModel.startSession();
    await session.withTransaction(async () => {
      const user = await this.userModel.findByIdAndUpdate(id, { avatar }).lean().session(session);
      if (!user)
        throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
      // Remove old avatar
      if (user.avatar)
        await this.imagekitService.deleteFolder(`${UserFileType.AVATAR}/${user.avatar._id}`);
    }).catch(async e => {
      // Try to rollback
      await this.imagekitService.deleteFolder(`${UserFileType.AVATAR}/${avatar._id}`);
      throw e;
    });
    const uploadedAvatar: Avatar = {
      avatarUrl: this.createAvatarUrl(avatar, ImagekitTransform.MEDIUM),
      thumbnailAvatarUrl: this.createAvatarUrl(avatar, ImagekitTransform.THUMBNAIL)
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
      await this.imagekitService.deleteFolder(`${UserFileType.AVATAR}/${user.avatar._id}`);
    });
    return null;
  }

  createAvatarUrl(avatar: UserAvatar, transform?: string) {
    if (avatar) {
      if (avatar.storage === CloudStorage.IMAGEKIT) {
        return `${process.env.IMAGEKIT_URL}/${transform ? transform + '/' : ''}${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
      }
    }
    return null;
  }

  async updateRoleUsers(id: string, newUsers: any[], oldUsers: any[], session: ClientSession) {
    if (newUsers.length)
      await this.userModel.updateMany({ _id: { $in: newUsers } }, { $push: { roles: id } }).session(session);
    if (oldUsers.length)
      await this.userModel.updateMany({ _id: { $in: oldUsers } }, { $pull: { roles: id } }).session(session);
  }

  addRoleUsers(id: string, users: any[]) {
    if (users.length)
      return this.userModel.updateMany({ _id: { $in: users } }, { $push: { roles: id } }).exec();
  }

  deleteRoleUsers(id: string, users: any[], session: ClientSession) {
    if (users.length)
      return this.userModel.updateMany({ _id: { $in: users } }, { $pull: { roles: id } }).session(session);
  }
}
