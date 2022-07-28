import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { isEqual } from 'lodash';

import { ExternalStorage, EncodingSetting, Setting, SettingDocument } from '../../schemas';
import { CreateSettingDto, UpdateSettingDto } from './dto';
import { Setting as SettingEntity, StorageBalancer } from './entities';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthService } from '../auth/auth.service';
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
        defaultStreamCodecs: 1,
        streamAudioParams: 1,
        streamH264Params: 1,
        streamVP9Params: 1,
        streamAV1Params: 1,
        streamQualityList: 1,
        streamEncodingSettings: 1
      }).populate('owner', { _id: 1, username: 1, displayName: 1, createdAt: 1, lastActiveAt: 1 })
        .lean().exec();
    }, { ttl: 3600 });
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
        auditLog.appendChange('owner', newUser._id, oldUser._id);
        await Promise.all([
          oldUser.save({ session }),
          newUser.save({ session })
        ]);
        setting.owner = <any>updateSettingDto.owner;
      }
      if (updateSettingDto.defaultStreamCodecs != undefined && setting.defaultStreamCodecs !== updateSettingDto.defaultStreamCodecs) {
        auditLog.appendChange('defaultStreamCodecs', updateSettingDto.defaultStreamCodecs, setting.defaultStreamCodecs);
        setting.defaultStreamCodecs = updateSettingDto.defaultStreamCodecs;
      }
      if (updateSettingDto.streamAudioParams !== undefined && setting.streamAudioParams !== updateSettingDto.streamAudioParams) {
        auditLog.appendChange('streamAudioParams', updateSettingDto.streamAudioParams, setting.streamAudioParams);
        setting.streamAudioParams = updateSettingDto.streamAudioParams;
      }
      if (updateSettingDto.streamH264Params !== undefined && setting.streamH264Params !== updateSettingDto.streamH264Params) {
        auditLog.appendChange('streamH264Params', updateSettingDto.streamH264Params, setting.streamH264Params);
        setting.streamH264Params = updateSettingDto.streamH264Params;
      }
      if (updateSettingDto.streamVP9Params !== undefined && setting.streamVP9Params !== updateSettingDto.streamVP9Params) {
        auditLog.appendChange('streamVP9Params', updateSettingDto.streamVP9Params, setting.streamVP9Params);
        setting.streamVP9Params = updateSettingDto.streamVP9Params;
      }
      if (updateSettingDto.streamAV1Params !== undefined && setting.streamAV1Params !== updateSettingDto.streamAV1Params) {
        auditLog.appendChange('streamAV1Params', updateSettingDto.streamAV1Params, setting.streamAV1Params);
        setting.streamAV1Params = updateSettingDto.streamAV1Params;
      }
      if (updateSettingDto.streamQualityList !== undefined && !isEqual(setting.streamQualityList, updateSettingDto.streamQualityList)) {
        updateSettingDto.streamQualityList.forEach(quality => {
          auditLog.appendChange('streamQualityList', quality);
        });
        setting.streamQualityList.forEach(quality => {
          auditLog.appendChange('streamQualityList', undefined, quality);
        });
        setting.streamQualityList = updateSettingDto.streamQualityList;
      }
      if (updateSettingDto.streamEncodingSettings && !isEqual(setting.streamEncodingSettings.toObject(), updateSettingDto.streamEncodingSettings)) {
        setting.streamEncodingSettings.forEach((settings, index) => {
          auditLog.appendChange(`streamEncodingSettings.[${index}].quality`, undefined, settings.quality);
          auditLog.appendChange(`streamEncodingSettings.[${index}].crf`, undefined, settings.crf);
          auditLog.appendChange(`streamEncodingSettings.[${index}].cq`, undefined, settings.cq);
          auditLog.appendChange(`streamEncodingSettings.[${index}].maxrate`, undefined, settings.maxrate);
          auditLog.appendChange(`streamEncodingSettings.[${index}].bufsize`, undefined, settings.bufsize);
          auditLog.appendChange(`streamEncodingSettings.[${index}].useLowerRate`, undefined, settings.useLowerRate);
        });
        updateSettingDto.streamEncodingSettings.forEach((settings, index) => {
          auditLog.appendChange(`streamEncodingSettings.[${index}].quality`, settings.quality);
          auditLog.appendChange(`streamEncodingSettings.[${index}].crf`, settings.crf);
          auditLog.appendChange(`streamEncodingSettings.[${index}].cq`, settings.cq);
          auditLog.appendChange(`streamEncodingSettings.[${index}].maxrate`, settings.maxrate);
          auditLog.appendChange(`streamEncodingSettings.[${index}].bufsize`, settings.bufsize);
          auditLog.appendChange(`streamEncodingSettings.[${index}].useLowerRate`, settings.useLowerRate);
        });
        setting.streamEncodingSettings = new Types.Array<EncodingSetting>();
        setting.streamEncodingSettings.push(...updateSettingDto.streamEncodingSettings);
      }
      const currentSourceStorages: any[] = setting.mediaSourceStorages.toObject();
      if (updateSettingDto.mediaSourceStorages !== undefined && !isEqual(currentSourceStorages, updateSettingDto.mediaSourceStorages)) {
        if (updateSettingDto.mediaSourceStorages?.length) {
          const newStorages = updateSettingDto.mediaSourceStorages.filter(e => !currentSourceStorages.includes(e));
          const oldStorages = currentSourceStorages.filter(e => !updateSettingDto.mediaSourceStorages.includes(e));
          const storageCount = await this.externalStoragesService.countOneDriveStorageByIds(newStorages);
          if (storageCount !== newStorages.length)
            throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Cannot find all the required media sources' }, HttpStatus.BAD_REQUEST);
          await Promise.all([
            this.externalStoragesService.addSettingStorages(newStorages, MediaStorageType.SOURCE, session),
            this.externalStoragesService.deleteSettingStorages(oldStorages, session)
          ]);
          newStorages.forEach(storage => {
            auditLog.appendChange('mediaSourceStorages', storage);
          });
          oldStorages.forEach(storage => {
            auditLog.appendChange('mediaSourceStorages', undefined, storage);
          })
          setting.mediaSourceStorages = <any>updateSettingDto.mediaSourceStorages;
        } else {
          setting.mediaSourceStorages = undefined;
        }
        await this.clearMediaSourceCache();
      }
      await Promise.all([
        setting.save({ session }),
        this.auditLogService.createLog(authUser._id, setting._id, Setting.name, AuditLogType.SETTINGS_UPDATE)
      ]);
    });
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return plainToInstance(SettingEntity, setting.toObject());
  }

  async remove(authUser: AuthUserDto) {
    const setting = await this.settingModel.findOneAndDelete({}).lean().exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    await Promise.all([
      this.localCacheService.del(CachePrefix.SETTINGS),
      // Deprecated
      this.clearMediaBackdropCache(),
      this.clearMediaPosterCache(),
      this.clearMediaSubtitleCache(),
      this.clearTVEpisodeStillCache(),
      // End deprecated
      this.clearMediaSourceCache(),
      this.auditLogService.createLog(authUser._id, setting._id, Setting.name, AuditLogType.SETTINGS_DELETE)
    ]);
  }

  async deleteMediaPosterStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaPosterStorage: <any>id }, { $unset: { mediaPosterStorage: 1 } }, { session });
    if (setting)
      await this.clearMediaPosterCache();
  }

  async deleteMediaBackdropStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaBackdropStorage: <any>id }, { $unset: { mediaBackdropStorage: 1 } }, { session });
    if (setting)
      await this.clearMediaBackdropCache();
  }

  async deleteMediaSourceStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaSourceStorages: <any>id }, { $pull: { mediaSourceStorages: <any>id } }).session(session);
    if (setting)
      await this.clearMediaSourceCache();
  }

  async deleteMediaSubtitleStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaSubtitleStorages: <any>id }, { $pull: { mediaSubtitleStorages: <any>id } }).session(session);
    if (setting)
      await this.clearMediaSubtitleCache();
  }

  async deleteTVEpisodeStillStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ tvEpisodeStillStorage: <any>id }, { $unset: { tvEpisodeStillStorage: 1 } }, { session });
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
    }, { ttl: 3600 });
  }

  async findMediaBackdropStorage() {
    return this.localCacheService.wrap<ExternalStorage>(CachePrefix.MEDIA_BACKDROP_STORAGE, async () => {
      const setting = await this.settingModel.findOne({}, { mediaBackdropStorage: 1 }).populate('mediaBackdropStorage').lean().exec();
      const storage = setting.mediaBackdropStorage;
      if (!storage)
        throw new HttpException({ code: StatusCode.BACKDROP_STORAGE_NOT_SET, message: 'Backdrop storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }, { ttl: 3600 });
  }

  async findTVEpisodeStillStorage() {
    return this.localCacheService.wrap<ExternalStorage>(CachePrefix.TV_EPISODE_STILL_STORAGE, async () => {
      const setting = await this.settingModel.findOne({}, { tvEpisodeStillStorage: 1 }).populate('tvEpisodeStillStorage').lean().exec();
      const storage = setting.tvEpisodeStillStorage;
      if (!storage)
        throw new HttpException({ code: StatusCode.STILL_STORAGE_NOT_SET, message: 'Still storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }, { ttl: 3600 });
  }

  async findMediaSourceStorage() {
    const setting = await this.settingModel.findOne({}, { mediaSourceStorages: 1 }).populate({
      path: 'mediaSourceStorages',
      options: {
        limit: 1,
        sort: { used: 1 }
      }
    }).lean().exec();
    if (!setting?.mediaSourceStorages?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STORAGE_NOT_SET, message: 'Media storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
    const storage = setting.mediaSourceStorages[0];
    await this.externalStoragesService.decryptToken(storage);
    return storage;
  }

  async findMediaSubtitleStorage() {
    const cachedStorage = await this.localCacheService.get<StorageBalancer>(CachePrefix.MEDIA_SUBTITLE_STORAGES);
    if (cachedStorage) {
      cachedStorage.current = cachedStorage.current < cachedStorage.storages.length - 1 ? cachedStorage.current + 1 : 0;
      await this.localCacheService.set(CachePrefix.MEDIA_SUBTITLE_STORAGES, cachedStorage, { ttl: 3600 });
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
    await this.localCacheService.set(CachePrefix.MEDIA_SUBTITLE_STORAGES, storageBalancer, { ttl: 3600 });
    const storage = storageBalancer.storages[storageBalancer.current];
    await this.externalStoragesService.decryptToken(storage);
    return storage;
  }

  async findStreamSettings() {
    const setting = await this.findOneAndCache();
    setting.owner = undefined;
    return setting;
  }
}
