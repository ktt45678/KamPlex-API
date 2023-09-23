import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';

import { ExternalStorage, EncodingSetting, Setting, SettingDocument } from '../../schemas';
import { CreateSettingDto, UpdateSettingDto } from './dto';
import { Setting as SettingEntity, StorageBalancer } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { ExternalStorage as ExternalStorageEntity } from '../external-storages';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { LocalCacheService } from '../../common/modules/local-cache/local-cache.service';
import { AuthUserDto } from '../users';
import { StatusCode, CachePrefix, MongooseConnection, MediaStorageType, AuditLogType } from '../../enums';
import { AuditLogBuilder, createSnowFlakeId } from '../../utils';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Setting.name, MongooseConnection.DATABASE_A) private settingModel: Model<SettingDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @Inject(forwardRef(() => ExternalStoragesService)) private externalStoragesService: ExternalStoragesService,
    private authService: AuthService, private auditLogService: AuditLogService, private localCacheService: LocalCacheService) { }

  async create(createSettingDto: CreateSettingDto) {
    const check = await this.settingModel.findOne({}).lean().exec();
    if (check)
      throw new HttpException({ code: StatusCode.SETTING_EXIST, message: 'Setting has already been created' }, HttpStatus.BAD_REQUEST);
    createSettingDto.owner = true;
    const user = await this.authService.createUser(createSettingDto);
    const setting = new this.settingModel({ owner: user._id });
    setting._id = await createSnowFlakeId();
    const auditLog = new AuditLogBuilder(user._id, setting._id, Setting.name, AuditLogType.SETTINGS_CREATE);
    auditLog.appendChange('owner', user._id);
    await Promise.all([
      setting.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return this.authService.createJwtToken(user);
  }

  async findOne(authUser: AuthUserDto) {
    const setting = await this.findOneAndCache();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    if (authUser.hasPermission)
      return setting;
  }

  findOneAndCache() {
    return this.localCacheService.wrap<Setting>(CachePrefix.SETTINGS, () => {
      return this.settingModel.findOne({}, {
        _id: 1,
        owner: 1,
        mediaSourceStorages: 1,
        linkedMediaSourceStorages: 1,
        defaultVideoCodecs: 1,
        audioParams: 1,
        audioSurroundParams: 1,
        videoH264Params: 1,
        videoVP9Params: 1,
        videoAV1Params: 1,
        videoQualityList: 1,
        videoEncodingSettings: 1
      }).populate([
        { path: 'owner', select: { _id: 1, username: 1, nickname: 1, createdAt: 1, lastActiveAt: 1 } },
        { path: 'mediaSourceStorages', select: { _id: 1, name: 1, kind: 1, folderName: 1 } },
        { path: 'linkedMediaSourceStorages', select: { _id: 1, name: 1, kind: 1, folderName: 1 } }
      ])
        .lean().exec();
    }, 3_600_000);
  }

  async update(updateSettingDto: UpdateSettingDto, authUser: AuthUserDto) {
    if (!Object.keys(updateSettingDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const setting = await this.settingModel.findOne({}).exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, setting._id, Setting.name, AuditLogType.SETTINGS_UPDATE);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (updateSettingDto.owner != undefined && updateSettingDto.owner !== <any>setting.owner) {
        const oldUser = await this.authService.findUserById(<any>setting.owner);
        const newUser = await this.authService.findUserById(updateSettingDto.owner);
        if (!newUser || !oldUser)
          throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User does not exist' }, HttpStatus.NOT_FOUND);
        oldUser.owner = undefined;
        newUser.owner = true;
        await oldUser.save({ session });
        await newUser.save({ session });
        setting.owner = <any>updateSettingDto.owner;
      }
      if (updateSettingDto.defaultVideoCodecs != undefined) {
        setting.defaultVideoCodecs = updateSettingDto.defaultVideoCodecs;
      }
      if (updateSettingDto.audioParams !== undefined) {
        setting.audioParams = updateSettingDto.audioParams;
      }
      if (updateSettingDto.audioSpeedParams !== undefined) {
        setting.audioSpeedParams = updateSettingDto.audioSpeedParams;
      }
      if (updateSettingDto.audioSurroundParams !== undefined) {
        setting.audioSurroundParams = updateSettingDto.audioSurroundParams;
      }
      if (updateSettingDto.videoH264Params !== undefined) {
        setting.videoH264Params = updateSettingDto.videoH264Params;
      }
      if (updateSettingDto.videoVP9Params !== undefined) {
        setting.videoVP9Params = updateSettingDto.videoVP9Params;
      }
      if (updateSettingDto.videoAV1Params !== undefined) {
        setting.videoAV1Params = updateSettingDto.videoAV1Params;
      }
      if (updateSettingDto.videoQualityList !== undefined) {
        setting.videoQualityList = updateSettingDto.videoQualityList;
      }
      if (updateSettingDto.videoEncodingSettings) {
        setting.videoEncodingSettings = new Types.DocumentArray<EncodingSetting>(updateSettingDto.videoEncodingSettings);
      }
      const currentSourceStorages = <bigint[]>setting.mediaSourceStorages.toObject();
      const updateSourceStorages = await this.resolveUpdateSourceStorages(currentSourceStorages, updateSettingDto.mediaSourceStorages, session);
      if (updateSourceStorages)
        setting.mediaSourceStorages = <any>updateSourceStorages;
      const currentLinkedSourceStorages = <bigint[]>setting.linkedMediaSourceStorages.toObject();
      const updateLinkedSourceStorages = await this.resolveUpdateSourceStorages(currentLinkedSourceStorages, updateSettingDto.linkedMediaSourceStorages, session);
      if (updateLinkedSourceStorages)
        setting.linkedMediaSourceStorages = <any>updateLinkedSourceStorages;
      auditLog.getChangesFrom(setting);
      await Promise.all([
        setting.save({ session }),
        this.auditLogService.createLog(authUser._id, setting._id, Setting.name, AuditLogType.SETTINGS_UPDATE)
      ]);
    }).finally(() => session.endSession().catch(() => { }));
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return plainToInstance(SettingEntity, setting.toObject());
  }

  async remove(authUser: AuthUserDto) {
    const setting = await this.settingModel.findOneAndDelete({}).lean().exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    await Promise.all([
      this.localCacheService.del(CachePrefix.SETTINGS),
      /* Deprecated
      this.clearMediaBackdropCache(),
      this.clearMediaPosterCache(),
      this.clearMediaSubtitleCache(),
      this.clearTVEpisodeStillCache(),
      */
      this.clearMediaSourceCache(),
      this.auditLogService.createLog(authUser._id, setting._id, Setting.name, AuditLogType.SETTINGS_DELETE)
    ]);
  }

  async deleteMediaPosterStorage(id: bigint, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaPosterStorage: id }, { $unset: { mediaPosterStorage: 1 } }, { session });
    if (setting)
      await this.clearMediaPosterCache();
  }

  async deleteMediaBackdropStorage(id: bigint, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaBackdropStorage: id }, { $unset: { mediaBackdropStorage: 1 } }, { session });
    if (setting)
      await this.clearMediaBackdropCache();
  }

  async deleteMediaSourceStorage(id: bigint, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaSourceStorages: id }, { $pull: { mediaSourceStorages: id } }, { session });
    if (setting)
      await this.clearMediaSourceCache();
  }

  async deleteMediaSubtitleStorage(id: bigint, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaSubtitleStorages: id }, { $pull: { mediaSubtitleStorages: id } }, { session });
    if (setting)
      await this.clearMediaSubtitleCache();
  }

  async deleteTVEpisodeStillStorage(id: bigint, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ tvEpisodeStillStorage: id }, { $unset: { tvEpisodeStillStorage: 1 } }, { session });
    if (setting)
      await this.clearTVEpisodeStillCache();
  }

  clearMediaPosterCache() {
    return this.localCacheService.del(CachePrefix.MEDIA_POSTER_STORAGE);
  }

  clearMediaBackdropCache() {
    return this.localCacheService.del(CachePrefix.MEDIA_BACKDROP_STORAGE);
  }

  clearTVEpisodeStillCache() {
    return this.localCacheService.del(CachePrefix.TV_EPISODE_STILL_STORAGE);
  }

  clearMediaSourceCache() {
    return this.localCacheService.del(CachePrefix.MEDIA_SOURCE_STORAGES);
  }

  clearMediaSubtitleCache() {
    return this.localCacheService.del(CachePrefix.MEDIA_SUBTITLE_STORAGES);
  }

  async findMediaPosterStorage() {
    return this.localCacheService.wrap<ExternalStorage>(CachePrefix.MEDIA_POSTER_STORAGE, async () => {
      const setting = await this.settingModel.findOne({}, { mediaPosterStorage: 1 }).populate('mediaPosterStorage').lean().exec();
      const storage = setting.mediaPosterStorage;
      if (!storage)
        throw new HttpException({ code: StatusCode.POSTER_STORAGE_NOT_SET, message: 'Poster storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }, 3_600_000);
  }

  async findMediaBackdropStorage() {
    return this.localCacheService.wrap<ExternalStorage>(CachePrefix.MEDIA_BACKDROP_STORAGE, async () => {
      const setting = await this.settingModel.findOne({}, { mediaBackdropStorage: 1 }).populate('mediaBackdropStorage').lean().exec();
      const storage = setting.mediaBackdropStorage;
      if (!storage)
        throw new HttpException({ code: StatusCode.BACKDROP_STORAGE_NOT_SET, message: 'Backdrop storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }, 3_600_000);
  }

  async findTVEpisodeStillStorage() {
    return this.localCacheService.wrap<ExternalStorage>(CachePrefix.TV_EPISODE_STILL_STORAGE, async () => {
      const setting = await this.settingModel.findOne({}, { tvEpisodeStillStorage: 1 }).populate('tvEpisodeStillStorage').lean().exec();
      const storage = setting.tvEpisodeStillStorage;
      if (!storage)
        throw new HttpException({ code: StatusCode.STILL_STORAGE_NOT_SET, message: 'Still storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }, 3_600_000);
  }

  async findMediaSourceStorage(options: { decrypt?: boolean } = {}) {
    const { decrypt = true } = options;
    const setting = await this.settingModel.findOne({}, { mediaSourceStorages: 1 }).populate({
      path: 'mediaSourceStorages',
      options: {
        limit: 1,
        sort: { used: 1 }
      }
    }).lean().exec();
    if (!setting?.mediaSourceStorages?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STORAGE_NOT_SET, message: 'Media storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
    const storage = plainToInstance(ExternalStorageEntity, setting.mediaSourceStorages[0]);
    if (decrypt)
      await this.externalStoragesService.decryptToken(storage);
    return storage;
  }

  async findLinkedMediaSourceStorages() {
    const setting = await this.settingModel.findOne({}, { linkedMediaSourceStorages: 1 }).populate({
      path: 'linkedMediaSourceStorages',
    }).lean().exec();
    if (!setting?.linkedMediaSourceStorages?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STORAGE_NOT_SET, message: 'Linked media storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
    const storages = plainToInstance(ExternalStorageEntity, setting.linkedMediaSourceStorages);
    await Promise.all(storages.map(storage => this.externalStoragesService.decryptToken(storage)));
    return storages;
  }

  async findMediaSubtitleStorage() {
    const cachedStorage = await this.localCacheService.get<StorageBalancer>(CachePrefix.MEDIA_SUBTITLE_STORAGES);
    if (cachedStorage) {
      cachedStorage.current = cachedStorage.current < cachedStorage.storages.length - 1 ? cachedStorage.current + 1 : 0;
      await this.localCacheService.set(CachePrefix.MEDIA_SUBTITLE_STORAGES, cachedStorage, 3_600_000);
      const storage = cachedStorage.storages[cachedStorage.current];
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }
    const setting = await this.settingModel.findOne({}, { mediaSubtitleStorages: 1 }).populate('mediaSubtitleStorages').lean().exec();
    if (!setting?.mediaSubtitleStorages?.length)
      throw new HttpException({ code: StatusCode.SUBTITLE_STORAGE_NOT_SET, message: 'Subtitle storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
    const storageBalancer = new StorageBalancer();
    storageBalancer.current = 0;
    storageBalancer.storages = <any>setting.mediaSubtitleStorages;
    await this.localCacheService.set(CachePrefix.MEDIA_SUBTITLE_STORAGES, storageBalancer, 3_600_000);
    const storage = storageBalancer.storages[storageBalancer.current];
    await this.externalStoragesService.decryptToken(storage);
    return storage;
  }

  async findStreamSettings() {
    const setting = await this.findOneAndCache();
    setting.owner = undefined;
    return setting;
  }

  private async resolveUpdateSourceStorages(currentSourceStorages: bigint[], mediaSourceStorages: bigint[], session: ClientSession) {
    if (mediaSourceStorages) {
      await this.clearMediaSourceCache();
      if (mediaSourceStorages.length) {
        const newStorages = mediaSourceStorages.filter(e => !currentSourceStorages.includes(e));
        const oldStorages = currentSourceStorages.filter(e => !mediaSourceStorages.includes(e));
        const storageCount = await this.externalStoragesService.countOneDriveStorageByIds(newStorages);
        if (storageCount !== newStorages.length)
          throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Cannot find all the required media sources' }, HttpStatus.BAD_REQUEST);
        await this.externalStoragesService.addSettingStorages(newStorages, MediaStorageType.SOURCE, session);
        await this.externalStoragesService.deleteSettingStorages(oldStorages, session);
        return mediaSourceStorages;
      } else {
        return [];
      }
    }
    return null;
  }
}
