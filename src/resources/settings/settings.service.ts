import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { Setting, SettingDocument } from '../../schemas/setting.schema';
import { BalancedStorage } from '../../schemas/balanced-storage.schema';
import { ExternalStorage } from '../../schemas/external-storage.schema';
import { AuthService } from '../auth/auth.service';
import { StatusCode } from '../../enums/status-code.enum';
import { LocalCacheService } from '../../common/local-cache/local-cache.service';
import { ExternalStoragesService } from '../external-storages/external-storages.service';
import { CachePrefix } from '../../enums/cache-prefix.enum';
import { plainToClass } from 'class-transformer';
import { Setting as SettingEntity } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>,
    @Inject(forwardRef(() => ExternalStoragesService)) private externalStoragesService: ExternalStoragesService,
    private authService: AuthService, private localCacheService: LocalCacheService) { }

  async create(createSettingDto: CreateSettingDto) {
    const check = await this.settingModel.findOne({}).lean().exec();
    if (check)
      throw new HttpException({ code: StatusCode.SETTING_EXIST, message: 'Setting has already been created' }, HttpStatus.BAD_REQUEST);
    const user = await this.authService.createUser(createSettingDto);
    const setting = new this.settingModel({ owner: user._id });
    await setting.save();
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return this.authService.createJwtToken(user);
  }

  async findOne() {
    await this.findMediaSourceStorage();
    const setting = await this.findOneAndCache();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    return setting;
  }

  findOneAndCache() {
    return this.localCacheService.wrap<Setting>(CachePrefix.SETTINGS, () => {
      return this.settingModel.findOne({}, { _id: 1, owner: 1 }).populate('owner', { _id: 1, username: 1, displayName: 1, createdAt: 1, lastActiveAt: 1 }).lean().exec();
    }, { ttl: 3600 });
  }

  async isOwner(authUser: AuthUserDto) {
    const setting = await this.findOneAndCache();
    return authUser._id === setting?.owner?._id;
  }

  async update(updateSettingDto: UpdateSettingDto) {
    const setting = await this.settingModel.findOne({}).exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    if (updateSettingDto.owner) {
      const user = await this.authService.findUserById(updateSettingDto.owner);
      if (!user)
        throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User does not exist' }, HttpStatus.NOT_FOUND);
      setting.owner = <any>updateSettingDto.owner;
    }
    if (updateSettingDto.mediaBackdropStorage !== undefined) {
      const storage = await this.externalStoragesService.findImgurStorageById(updateSettingDto.mediaBackdropStorage);
      if (!storage)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Backdrop storage not found' }, HttpStatus.NOT_FOUND);
      setting.mediaBackdropStorage = <any>updateSettingDto.mediaBackdropStorage;
    }
    if (updateSettingDto.mediaPosterStorage !== undefined) {
      const storage = await this.externalStoragesService.findImgurStorageById(updateSettingDto.mediaPosterStorage);
      if (!storage)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Poster storage not found' }, HttpStatus.NOT_FOUND);
      setting.mediaPosterStorage = <any>updateSettingDto.mediaPosterStorage;
    }
    if (updateSettingDto.mediaSourceStorages !== undefined) {
      if (updateSettingDto.mediaSourceStorages?.length) {
        const storages = await this.externalStoragesService.finGoogleDriveStoragedByIds(updateSettingDto.mediaSourceStorages);
        if (storages.length !== updateSettingDto.mediaSourceStorages.length)
          throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Cannot find all the required media sources' }, HttpStatus.NOT_FOUND);
        const mediaSources: any[] = updateSettingDto.mediaSourceStorages;
        // Remove old storages
        for (let i = 0; i < setting.mediaSourceStorages.length; i++) {
          if (!mediaSources.includes(setting.mediaSourceStorages[i].source))
            setting.mediaSourceStorages.splice(i, 1);
        }
        // Add new storages
        for (let i = 0; i < mediaSources.length; i++) {
          if (setting.mediaSourceStorages.find(m => m.source === mediaSources[i]))
            continue;
          const balancedStorage = new BalancedStorage();
          balancedStorage.source = mediaSources[i];
          setting.mediaSourceStorages.push(balancedStorage);
        }
      } else {
        setting.mediaSourceStorages = [];
      }
    }
    const result = await setting.save();
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return plainToClass(SettingEntity, result.toObject());
  }

  async remove() {
    const setting = await this.settingModel.findOneAndDelete({}).lean().exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    await this.localCacheService.del(CachePrefix.SETTINGS);
  }

  async updateMediaImageStorage(id: string) {
    const setting = await this.settingModel.findOne({ $or: [{ mediaPosterStorage: <any>id }, { mediaBackdropStorage: <any>id }] }).exec();
    if (!setting)
      return null;
    if (setting.mediaPosterStorage === <any>id)
      await this.localCacheService.del(CachePrefix.MEDIA_POSTER_STORAGE);
    if (setting.mediaBackdropStorage === <any>id)
      await this.localCacheService.del(CachePrefix.MEDIA_BACKDROP_STORAGE);
  }

  async deleteMediaImageStorage(id: string, session: ClientSession) {
    const setting = await this.settingModel.findOne({ $or: [{ mediaPosterStorage: <any>id }, { mediaBackdropStorage: <any>id }] }).session(session);
    if (!setting)
      return null;
    if (setting.mediaPosterStorage === <any>id) {
      setting.mediaPosterStorage = null;
      await this.localCacheService.del(CachePrefix.MEDIA_POSTER_STORAGE);
    }
    if (setting.mediaBackdropStorage === <any>id) {
      setting.mediaBackdropStorage = null;
      await this.localCacheService.del(CachePrefix.MEDIA_BACKDROP_STORAGE);
    }
    return setting.save();
  }

  deleteGoogleDriveStorage(id: string, session: ClientSession) {
    return this.settingModel.findOneAndUpdate({ mediaSourceStorages: { $elemMatch: { source: id } } }, { $pull: { mediaSourceStorages: { source: id } } }).session(session);
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

  async findMediaSourceStorage() {
    const setting = await this.settingModel.findOne({}).populate('mediaSourceStorages.source').exec();
    if (!setting?.mediaSourceStorages?.length)
      throw new HttpException({ code: StatusCode.MEDIA_STORAGE_NOT_SET, message: 'Media storage is not available, please contact the owner to set it up' }, HttpStatus.BAD_REQUEST);
    setting.mediaSourceStorages.sort((a, b) => (a.used - b.used));
    setting.mediaSourceStorages[0].used += 1;
    const storage = (await setting.save()).mediaSourceStorages[0].source;
    return storage;
  }
}
