import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting, SettingDocument } from '../../schemas/setting.schema';
import { ExternalStorage } from '../../schemas/external-storage.schema';
import { AuthService } from '../auth/auth.service';
import { StatusCode } from '../../enums/status-code.enum';
import { LocalCacheService } from '../../common/local-cache/local-cache.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { CachePrefix } from '../../enums/cache-prefix.enum';
import { plainToClass } from 'class-transformer';
import { Setting as SettingEntity } from './entities/setting.entity';
import { StorageBalancer } from './entities/storage-balancer.entity';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { MediaStorageType } from '../../enums/media-storage-type.enum';
import { createSnowFlakeIdAsync } from '../../utils/snowflake-id.util';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @Inject(forwardRef(() => ExternalStoragesService)) private externalStoragesService: ExternalStoragesService,
    private authService: AuthService, private localCacheService: LocalCacheService) { }

  async create(createSettingDto: CreateSettingDto) {
    const check = await this.settingModel.findOne({}).lean().exec();
    if (check)
      throw new HttpException({ code: StatusCode.SETTING_EXIST, message: 'Setting has already been created' }, HttpStatus.BAD_REQUEST);
    createSettingDto.owner = true;
    const user = await this.authService.createUser(createSettingDto);
    const setting = new this.settingModel({ owner: user._id });
    setting._id = await createSnowFlakeIdAsync();
    await setting.save();
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return this.authService.createJwtToken(user);
  }

  async findOne() {
    const setting = await this.findOneAndCache();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    return setting;
  }

  findOneAndCache() {
    return this.localCacheService.wrap<Setting>(CachePrefix.SETTINGS, () => {
      return this.settingModel.findOne({}, { _id: 1, owner: 1, defaultStreamCodecs: 1 })
        .populate('owner', { _id: 1, username: 1, displayName: 1, createdAt: 1, lastActiveAt: 1 })
        .lean().exec();
    }, { ttl: 3600 });
  }

  async update(updateSettingDto: UpdateSettingDto) {
    if (!Object.keys(updateSettingDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const setting = await this.settingModel.findOne({}).exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      if (updateSettingDto.owner != undefined && updateSettingDto.owner !== <any>setting.owner) {
        const oldUser = await this.authService.findUserById(<any>setting.owner);
        const newUser = await this.authService.findUserById(updateSettingDto.owner);
        if (!newUser || !oldUser)
          throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User does not exist' }, HttpStatus.NOT_FOUND);
        oldUser.owner = undefined;
        newUser.owner = true;
        await Promise.all([
          oldUser.save({ session }),
          newUser.save({ session })
        ]);
        setting.owner = <any>updateSettingDto.owner;
      }
      updateSettingDto.defaultStreamCodecs != undefined && (setting.defaultStreamCodecs = updateSettingDto.defaultStreamCodecs);
      if (updateSettingDto.mediaBackdropStorage !== undefined && <any>setting.mediaBackdropStorage !== updateSettingDto.mediaBackdropStorage) {
        if (updateSettingDto.mediaBackdropStorage !== null) {
          const storage = await this.externalStoragesService.findStorageById(updateSettingDto.mediaBackdropStorage);
          if (!storage)
            throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Backdrop storage not found' }, HttpStatus.NOT_FOUND);
        }
        await Promise.all([
          this.externalStoragesService.addSettingStorage(updateSettingDto.mediaBackdropStorage, MediaStorageType.BACKDROP, session),
          this.externalStoragesService.deleteSettingStorage(<any>setting.mediaBackdropStorage, session),
          this.clearMediaBackdropCache()
        ]);
        setting.mediaBackdropStorage = <any>updateSettingDto.mediaBackdropStorage;
      }
      if (updateSettingDto.mediaPosterStorage !== undefined && <any>setting.mediaPosterStorage !== updateSettingDto.mediaPosterStorage) {
        if (updateSettingDto.mediaPosterStorage !== null) {
          const storage = await this.externalStoragesService.findStorageById(updateSettingDto.mediaPosterStorage);
          if (!storage)
            throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Poster storage not found' }, HttpStatus.NOT_FOUND);
        }
        await Promise.all([
          this.externalStoragesService.addSettingStorage(updateSettingDto.mediaPosterStorage, MediaStorageType.POSTER, session),
          this.externalStoragesService.deleteSettingStorage(<any>setting.mediaPosterStorage, session),
          this.clearMediaPosterCache()
        ]);
        setting.mediaPosterStorage = <any>updateSettingDto.mediaPosterStorage;
      }
      if (updateSettingDto.tvEpisodeStillStorage !== undefined && <any>setting.tvEpisodeStillStorage !== updateSettingDto.tvEpisodeStillStorage) {
        if (updateSettingDto.tvEpisodeStillStorage !== null) {
          const storage = await this.externalStoragesService.findStorageById(updateSettingDto.tvEpisodeStillStorage);
          if (!storage)
            throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Still storage not found' }, HttpStatus.NOT_FOUND);
        }
        await Promise.all([
          this.externalStoragesService.addSettingStorage(updateSettingDto.tvEpisodeStillStorage, MediaStorageType.STILL, session),
          this.externalStoragesService.deleteSettingStorage(<any>setting.tvEpisodeStillStorage, session),
          this.clearTVEpisodeStillCache()
        ]);
        setting.tvEpisodeStillStorage = <any>updateSettingDto.tvEpisodeStillStorage;
      }
      if (updateSettingDto.mediaSourceStorages !== undefined) {
        if (updateSettingDto.mediaSourceStorages?.length) {
          const storageCount = await this.externalStoragesService.countGoogleDriveStorageByIds(updateSettingDto.mediaSourceStorages);
          if (storageCount !== updateSettingDto.mediaSourceStorages.length)
            throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Cannot find all the required media sources' }, HttpStatus.NOT_FOUND);
          await this.externalStoragesService.addSettingStorages(updateSettingDto.mediaSourceStorages, MediaStorageType.SOURCE, session);
          await this.externalStoragesService.deleteSettingStorages(<any>setting.mediaSourceStorages, session);
          setting.mediaSourceStorages = <any>updateSettingDto.mediaSourceStorages;
        } else {
          setting.mediaSourceStorages = new Types.Array();
        }
        await this.clearMediaSourceCache();
      }
      if (updateSettingDto.mediaSubtitleStorages !== undefined) {
        if (updateSettingDto.mediaSubtitleStorages?.length) {
          const storageCount = await this.externalStoragesService.countDropboxStorageByIds(updateSettingDto.mediaSubtitleStorages);
          if (storageCount !== updateSettingDto.mediaSubtitleStorages.length)
            throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Cannot find all the required media sources' }, HttpStatus.NOT_FOUND);
          await this.externalStoragesService.addSettingStorages(updateSettingDto.mediaSubtitleStorages, MediaStorageType.SUBTITLE, session);
          await this.externalStoragesService.deleteSettingStorages(<any>setting.mediaSubtitleStorages, session);
          setting.mediaSubtitleStorages = <any>updateSettingDto.mediaSubtitleStorages;
        } else {
          setting.mediaSubtitleStorages = new Types.Array();
        }
        await this.clearMediaSubtitleCache();
      }
      await setting.save({ session });
    });
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return plainToClass(SettingEntity, setting.toObject());
  }

  async remove() {
    const setting = await this.settingModel.findOneAndDelete({}).lean().exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    await Promise.all([
      this.localCacheService.del(CachePrefix.SETTINGS),
      this.clearMediaBackdropCache(),
      this.clearMediaPosterCache(),
      this.clearMediaSourceCache(),
      this.clearMediaSubtitleCache(),
      this.clearTVEpisodeStillCache()
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
    const setting = await this.settingModel.findOneAndUpdate({ mediaSourceStorages: <any>id }, { $pull: { mediaSourceStorages: id } }).session(session);
    if (setting)
      await this.clearMediaSourceCache();
  }

  async deleteMediaSubtitleStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOneAndUpdate({ mediaSubtitleStorages: <any>id }, { $pull: { mediaSubtitleStorages: id } }).session(session);
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
    const cachedStorage = await this.localCacheService.get<StorageBalancer>(CachePrefix.MEDIA_SOURCE_STORAGES);
    if (cachedStorage) {
      cachedStorage.current = cachedStorage.current < cachedStorage.storages.length - 1 ? cachedStorage.current + 1 : 0;
      await this.localCacheService.set(CachePrefix.MEDIA_SOURCE_STORAGES, cachedStorage, { ttl: 3600 });
      const storage = cachedStorage.storages[cachedStorage.current];
      await this.externalStoragesService.decryptToken(storage);
      return storage;
    }
    const setting = await this.settingModel.findOne({}, { mediaSourceStorages: 1 }).populate('mediaSourceStorages').lean().exec();
    if (!setting?.mediaSourceStorages?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STORAGE_NOT_SET, message: 'Media storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
    const storageBalancer = new StorageBalancer();
    storageBalancer.current = 0;
    storageBalancer.storages = <any>setting.mediaSourceStorages;
    await this.localCacheService.set(CachePrefix.MEDIA_SOURCE_STORAGES, storageBalancer, { ttl: 3600 });
    const storage = storageBalancer.storages[storageBalancer.current];
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

  async findDefaultStreamCodecs() {
    const setting = await this.findOneAndCache();
    return setting.defaultStreamCodecs;
  }
}
