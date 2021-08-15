import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting, SettingDocument } from '../../schemas/setting.schema';
import { AuthService } from '../auth/auth.service';
import { StatusCode } from '../../enums/status-code.enum';
import { LocalCacheService } from '../../common/local-cache/local-cache.service';
import { CachePrefix } from '../../enums/cache-prefix.enum';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>, private authService: AuthService, private localCacheService: LocalCacheService) { }

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
    const setting = await this.findOneAndCache();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    return setting;
  }

  findOneAndCache() {
    return this.localCacheService.wrap<Setting>(CachePrefix.SETTINGS, () => {
      return this.settingModel.findOne({}).populate('owner', { _id: 1, username: 1, displayName: 1, createdAt: 1, lastActiveAt: 1 }).lean().exec();
    }, { ttl: 3600 });
  }

  async update(updateSettingDto: UpdateSettingDto) {
    const userId: any = updateSettingDto.owner;
    const user = await this.authService.findUserById(userId);
    if (!user)
      throw new HttpException({ code: StatusCode.USER_NOT_FOUND, message: 'User does not exist' }, HttpStatus.NOT_FOUND);
    const setting = await this.settingModel.findOneAndUpdate({}, { $set: { owner: userId } }).lean().exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return { message: 'Setting has been updated' };
  }

  async remove() {
    const setting = await this.settingModel.findOneAndDelete({}).lean().exec();
    if (!setting)
      throw new HttpException({ code: StatusCode.SETTING_NOT_EXIST, message: 'Setting was not created' }, HttpStatus.NOT_FOUND);
    await this.localCacheService.del(CachePrefix.SETTINGS);
    return { message: 'Setting has been deleted' };
  }
}
