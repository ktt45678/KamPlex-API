import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, ProjectionType } from 'mongoose';
import { nanoid } from 'nanoid/async';
import { plainToInstance, plainToClassFromExist } from 'class-transformer';

import { User, UserDocument, UserFile } from '../../schemas';
import { AuthUserDto, UpdateUserDto, UpdateUserSettingsDto } from './dto';
import { Avatar, User as UserEntity, UserDetails } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { HttpEmailService } from '../../common/modules/http-email/http-email.service';
import { CloudflareR2Service } from '../../common/modules/cloudflare-r2';
import { PermissionsService } from '../../common/modules/permissions/permissions.service';
import { Paginated } from '../../common/entities';
import { PaginateDto } from '../roles';
import { StatusCode, SendgridTemplate, AuditLogType, MongooseConnection, CloudflareR2Container } from '../../enums';
import { MongooseOffsetPagination, LookupOptions, createCloudflareR2Url, createCloudflareR2ProxyUrl, createSnowFlakeId, escapeRegExp, trimSlugFilename, AuditLogBuilder } from '../../utils';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name, MongooseConnection.DATABASE_A) private userModel: Model<UserDocument>,
    private authService: AuthService, private auditLogService: AuditLogService,
    private httpEmailService: HttpEmailService, private cloudflareR2Service: CloudflareR2Service,
    private permissionsService: PermissionsService, private configService: ConfigService) { }

  async findAll(paginateDto: PaginateDto) {
    const sortEnum = ['_id', 'username'];
    const fields = { _id: 1, username: 1, nickname: 1, roles: 1, createdAt: 1, banned: 1, lastActiveAt: 1, avatar: 1 };
    const { page, limit, sort, search } = paginateDto;
    const filters = search ? { username: { $regex: escapeRegExp(search), $options: 'i' } } : {};
    const aggregation = new MongooseOffsetPagination({ page, limit, filters, fields, sortQuery: sort, sortEnum });
    const lookupOptions: LookupOptions[] = [{
      from: 'roles',
      localField: 'roles',
      foreignField: '_id',
      as: 'roles',
      pipeline: [
        { $project: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 } },
        { $sort: { position: 1 } }
      ],
      isArray: true
    }];
    const [data] = await this.userModel.aggregate(aggregation.buildLookup(lookupOptions)).exec();
    const users = data ? plainToClassFromExist(new Paginated<UserEntity>({ type: UserEntity }), data) : new Paginated<UserEntity>();
    return users;
  }

  async findOne(id: bigint, authUser: AuthUserDto) {
    let projection: ProjectionType<UserDocument>;
    if (!authUser.isAnonymous && (authUser._id === id || authUser.hasPermission)) {
      projection = {
        _id: 1, username: 1, email: 1, nickname: 1, about: 1, birthdate: 1, roles: 1, createdAt: 1, verified: 1, banned: 1,
        lastActiveAt: 1, avatar: 1, banner: 1, settings: 1
      };
    } else {
      projection = {
        _id: 1, username: 1, nickname: 1, about: 1, roles: 1, createdAt: 1, banned: 1,
        lastActiveAt: 1, avatar: 1, banner: 1, settings: 1
      };
    }
    const user = await this.userModel.findOne({ _id: id }, projection)
      .populate({ path: 'roles', select: { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }, options: { sort: { position: 1 } } })
      .lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    return plainToInstance(UserDetails, user);
  }

  async update(id: bigint, updateUserDto: UpdateUserDto, authUser: AuthUserDto) {
    if (authUser._id !== id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user' }, HttpStatus.FORBIDDEN);
    if (!Object.keys(updateUserDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const user = await this.userModel.findOne({ _id: id }).populate('roles', { _id: 1, name: 1, color: 1, permissions: 1, position: 1 }).exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    if (updateUserDto.currentPassword != undefined) {
      const isValidPassword = await this.authService.comparePassword(updateUserDto.currentPassword, user.password);
      if (!isValidPassword)
        throw new HttpException({ code: StatusCode.INCORRECT_PASSWORD, message: 'Current password is incorrect' }, HttpStatus.BAD_REQUEST);
    }
    updateUserDto.nickname !== undefined && (user.nickname = updateUserDto.nickname);
    updateUserDto.birthdate != undefined && (user.birthdate = updateUserDto.birthdate);
    updateUserDto.about !== undefined && (user.about = updateUserDto.about);
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
      const [randomPassword, recoveryCode] = await Promise.all([nanoid(), nanoid(8)]);
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
      const activationCode = await nanoid(8);
      user.activationCode = activationCode;
    }
    const newUser = await user.save();
    if (oldEmail !== newUser.email) {
      await Promise.all([
        this.httpEmailService.sendEmailSendGrid(newUser.email, newUser.username, 'Confirm your new email',
          SendgridTemplate.UPDATE_EMAIL, {
          recipient_name: newUser.username,
          button_url: `${this.configService.get('WEBSITE_URL')}/confirm-email?id=${newUser._id}&code=${newUser.activationCode}`
        }),
        this.httpEmailService.sendEmailSendGrid(oldEmail, newUser.username, 'Your email has been changed',
          SendgridTemplate.EMAIL_CHANGED, {
          recipient_name: newUser.username,
          new_email: newUser.email
        })
      ]);
    }
    if (authUser._id !== id && authUser.hasPermission) {
      // Send email to notify user
      if (updateUserDto.restoreAccount) {
        await this.httpEmailService.sendEmailSendGrid(newUser.email, newUser.username, 'We have restored your account',
          SendgridTemplate.ACCOUNT_MANAGE_RESTORED, {
          recipient_name: newUser.username,
          username: newUser.username,
          email: newUser.email,
          nickname: newUser.nickname ?? 'Not set',
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
          nickname: updateUserDto.nickname ?? '(Not changed)',
          birthdate: updateUserDto.birthdate != undefined ? `${updateUserDto.birthdate.day}/${updateUserDto.birthdate.month}/${updateUserDto.birthdate.year}` : '(Not changed)'
        });
      }
      await this.auditLogService.createLogFromBuilder(auditLog);
    }
    await this.authService.clearCachedAuthUser(id);
    const userPayload = newUser.toObject();
    userPayload.avatar = undefined;
    userPayload.banner = undefined;
    return plainToInstance(UserDetails, userPayload);
  }

  async updateSettings(id: bigint, updateUserSettingsDto: UpdateUserSettingsDto, authUser: AuthUserDto) {
    if (authUser._id !== id && !authUser.hasPermission)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user' }, HttpStatus.FORBIDDEN);
    if (!Object.keys(updateUserSettingsDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const user = await this.userModel.findOne({ _id: id }, { _id: 1, settings: 1 }).exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    const { player, subtitle, history, playlist, historyList, playlistList, ratingList } = updateUserSettingsDto;
    if (player) {
      player.muted !== undefined && (user.settings.player.muted = player.muted);
      player.volume !== undefined && (user.settings.player.volume = player.volume);
      player.audioTrack !== undefined && (user.settings.player.audioTrack = player.audioTrack);
      player.audioSurround !== undefined && (user.settings.player.audioSurround = player.audioSurround);
      player.quality !== undefined && (user.settings.player.quality = player.quality);
      player.speed !== undefined && (user.settings.player.speed = player.speed);
      player.subtitle !== undefined && (user.settings.player.subtitle = player.subtitle);
      player.subtitleLang !== undefined && (user.settings.player.subtitleLang = player.subtitleLang);
      player.autoNext !== undefined && (user.settings.player.autoNext = player.autoNext);
      player.prefAudioLang !== undefined && (user.settings.player.prefAudioLang = player.prefAudioLang);
      player.prefAudioLangList !== undefined && (user.settings.player.prefAudioLangList = player.prefAudioLangList);
      player.prefSubtitleLang !== undefined && (user.settings.player.prefSubtitleLang = player.prefSubtitleLang);
      player.prefSubtitleLangList !== undefined && (user.settings.player.prefSubtitleLangList = player.prefSubtitleLangList);
      player.enabledVideoCodecs !== undefined && (user.settings.player.enabledVideoCodecs = player.enabledVideoCodecs);
    }
    if (subtitle) {
      subtitle.fontSize !== undefined && (user.settings.subtitle.fontSize = subtitle.fontSize);
      subtitle.fontFamily !== undefined && (user.settings.subtitle.fontFamily = subtitle.fontFamily);
      subtitle.fontWeight !== undefined && (user.settings.subtitle.fontWeight = subtitle.fontWeight);
      subtitle.textColor !== undefined && (user.settings.subtitle.textColor = subtitle.textColor);
      subtitle.textAlpha !== undefined && (user.settings.subtitle.textAlpha = subtitle.textAlpha);
      subtitle.textEdge !== undefined && (user.settings.subtitle.textEdge = subtitle.textEdge);
      subtitle.bgColor !== undefined && (user.settings.subtitle.bgColor = subtitle.bgColor);
      subtitle.bgAlpha !== undefined && (user.settings.subtitle.bgAlpha = subtitle.bgAlpha);
      subtitle.winColor !== undefined && (user.settings.subtitle.winColor = subtitle.winColor);
      subtitle.winAlpha !== undefined && (user.settings.subtitle.winAlpha = subtitle.winAlpha);
      subtitle.override !== undefined && (user.settings.subtitle.override = subtitle.override);
    }
    if (history) {
      history.limit !== undefined && (user.settings.history.limit = history.limit);
      history.paused !== undefined && (user.settings.history.paused = history.paused);
    }
    if (playlist) {
      playlist.visibility !== undefined && (user.settings.playlist.visibility = playlist.visibility);
      playlist.recentId !== undefined && (user.settings.playlist.recentId = playlist.recentId);
    }
    if (historyList) {
      historyList.view !== undefined && (user.settings.historyList.view = historyList.view);
      historyList.visibility !== undefined && (user.settings.historyList.visibility = historyList.visibility);
    }
    if (playlistList) {
      playlistList.view !== undefined && (user.settings.playlistList.view = playlistList.view);
    }
    if (ratingList) {
      ratingList.view !== undefined && (user.settings.ratingList.view = ratingList.view);
      ratingList.editMode !== undefined && (user.settings.ratingList.editMode = ratingList.editMode);
      ratingList.visibility !== undefined && (user.settings.ratingList.visibility = ratingList.visibility);
    }
    await user.save();
    return user.settings;
  }

  async findOneAvatar(id: bigint) {
    const user = await this.userModel.findOne({ _id: id }, { avatar: 1 }).lean().exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    if (!user.avatar)
      return;
    const uploadedAvatar: Avatar = {
      avatarUrl: createCloudflareR2ProxyUrl(CloudflareR2Container.AVATARS, `${user.avatar._id}/${user.avatar.name}`, 450),
      thumbnailAvatarUrl: createCloudflareR2ProxyUrl(CloudflareR2Container.AVATARS, `${user.avatar._id}/${user.avatar.name}`, 250),
      smallAvatarUrl: createCloudflareR2ProxyUrl(CloudflareR2Container.AVATARS, `${user.avatar._id}/${user.avatar.name}`, 120),
      fullAvatarUrl: createCloudflareR2Url(CloudflareR2Container.AVATARS, `${user.avatar._id}/${user.avatar.name}`),
      avatarColor: user.avatar.color,
      avatarPlaceholder: user.avatar.placeholder
    };
    return uploadedAvatar;
  }

  async updateAvatar(id: bigint, file: Storage.MultipartFile, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user avatar' }, HttpStatus.FORBIDDEN);
    const user = await this.userModel.findOne({ _id: id }, { avatar: 1 }).exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    const avatarId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveTo = `${avatarId}/${trimmedFilename}`;
    await this.cloudflareR2Service.upload(CloudflareR2Container.AVATARS, saveTo, file.filepath, file.mimetype);
    if (user.avatar)
      await this.cloudflareR2Service.delete(CloudflareR2Container.AVATARS, `${user.avatar._id}/${user.avatar.name}`);
    const avatar = new UserFile();
    avatar._id = avatarId;
    avatar.name = trimmedFilename;
    avatar.color = file.color;
    avatar.placeholder = file.thumbhash;
    avatar.mimeType = file.mimetype;
    user.avatar = avatar;
    try {
      await user.save();
    } catch (e) {
      await this.cloudflareR2Service.delete(CloudflareR2Container.AVATARS, `${avatar._id}/${avatar.name}`);
      throw e;
    }
    return plainToInstance(UserEntity, user.toObject());
  }

  async deleteAvatar(id: bigint, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to delete this user avatar' }, HttpStatus.FORBIDDEN);
    const session = await this.userModel.startSession();
    await session.withTransaction(async () => {
      const user = await this.userModel.findOneAndUpdate({ _id: id }, { $unset: { avatar: 1 } }).lean().session(session);
      if (!user)
        throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
      if (!user.avatar)
        throw new HttpException({ code: StatusCode.AVATAR_NOT_FOUND, message: 'Avatar not found' }, HttpStatus.NOT_FOUND);
      await this.cloudflareR2Service.delete(CloudflareR2Container.AVATARS, `${user.avatar._id}/${user.avatar.name}`);
    }).finally(() => session.endSession().catch(() => { }));
  }

  async updateBanner(id: bigint, file: Storage.MultipartFile, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to update this user banner' }, HttpStatus.FORBIDDEN);
    const user = await this.userModel.findOne({ _id: id }, { banner: 1 }).exec();
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    const bannerId = await createSnowFlakeId();
    const trimmedFilename = trimSlugFilename(file.filename);
    const saveTo = `${bannerId}/${trimmedFilename}`;
    await this.cloudflareR2Service.upload(CloudflareR2Container.BANNERS, saveTo, file.filepath, file.mimetype);
    if (user.banner)
      await this.cloudflareR2Service.delete(CloudflareR2Container.BANNERS, `${user.banner._id}/${user.banner.name}`);
    const banner = new UserFile();
    banner._id = bannerId;
    banner.name = trimmedFilename;
    banner.color = file.color;
    banner.placeholder = file.thumbhash;
    banner.mimeType = file.mimetype;
    user.banner = banner;
    try {
      await user.save();
    } catch (e) {
      await this.cloudflareR2Service.delete(CloudflareR2Container.BANNERS, `${banner._id}/${banner.name}`);
      throw e;
    }
    return plainToInstance(UserDetails, user.toObject());
  }

  async deleteBanner(id: bigint, authUser: AuthUserDto) {
    if (authUser._id !== id)
      throw new HttpException({ code: StatusCode.ACCESS_DENIED, message: 'You do not have permission to delete this user banner' }, HttpStatus.FORBIDDEN);
    const session = await this.userModel.startSession();
    await session.withTransaction(async () => {
      const user = await this.userModel.findOneAndUpdate({ _id: id }, { $unset: { banner: 1 } }).lean().session(session);
      if (!user)
        throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
      if (!user.banner)
        throw new HttpException({ code: StatusCode.BANNER_NOT_FOUND, message: 'Banner not found' }, HttpStatus.NOT_FOUND);
      await this.cloudflareR2Service.delete(CloudflareR2Container.BANNERS, `${user.banner._id}/${user.banner.name}`);
    }).finally(() => session.endSession().catch(() => { }));
  }

  countByIds(ids: bigint[]) {
    return this.userModel.countDocuments({ _id: { $in: ids } }).exec();
  }

  async updateRoleUsers(id: bigint, newUsers: any[], oldUsers: any[], session: ClientSession) {
    if (newUsers.length)
      await this.userModel.updateMany({ _id: { $in: newUsers } }, { $push: { roles: id } }).session(session);
    if (oldUsers.length)
      await this.userModel.updateMany({ _id: { $in: oldUsers } }, { $pull: { roles: id } }).session(session);
  }

  addRoleUsers(id: bigint, users: any[]) {
    if (users.length)
      return this.userModel.updateMany({ _id: { $in: users } }, { $push: { roles: id } }).exec();
  }

  deleteRoleUsers(id: bigint, users: any[], session: ClientSession) {
    if (users.length)
      return this.userModel.updateMany({ _id: { $in: users } }, { $pull: { roles: id } }).session(session);
  }
}
