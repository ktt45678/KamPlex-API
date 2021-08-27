import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { Connection, Model } from 'mongoose';

import { ExternalStorage, ExternalStorageDocument } from '../../schemas/external-storage.schema';
import { StatusCode } from '../../enums/status-code.enum';
import { CloudStorage } from '../../enums/cloud-storage.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { AddStorageDto } from './dto/add-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import { StringCrypto } from '../../utils/string-crypto.util';
import { ExternalStorage as ExternalStorageEntity } from './entities/external-storage.entity';
import { SettingsService } from '../settings/settings.service';
import { EXTERNAL_STORAGE_LIMIT } from '../../config';

@Injectable()
export class ExternalStoragesService {
  constructor(@InjectModel(ExternalStorage.name) private externalStorageModel: Model<ExternalStorageDocument>, @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService) { }

  async create(addStorageDto: AddStorageDto) {
    const totalStorage = await this.externalStorageModel.estimatedDocumentCount().exec();
    if (totalStorage >= EXTERNAL_STORAGE_LIMIT)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_LIMIT, message: 'External storage limit reached' }, HttpStatus.BAD_REQUEST);
    const stringCrypto = new StringCrypto(process.env.CRYPTO_SECRET_KEY);
    const storage = new this.externalStorageModel({
      name: addStorageDto.name,
      kind: addStorageDto.kind,
      refreshToken: await stringCrypto.encrypt(addStorageDto.refreshToken)
    });
    addStorageDto.accessToken !== undefined && (storage.accessToken = await stringCrypto.encrypt(addStorageDto.accessToken));
    addStorageDto.expiresAt !== undefined && (storage.expiresAt = addStorageDto.expiresAt);
    addStorageDto.folderId !== undefined && (storage.folderId = addStorageDto.folderId);
    addStorageDto.folderName !== undefined && (storage.folderName = addStorageDto.folderName);
    addStorageDto.publicUrl !== undefined && (storage.publicUrl = addStorageDto.publicUrl);
    const result = await storage.save();
    return plainToClass(ExternalStorageEntity, result.toObject());
  }

  async findAll() {
    const storages = await this.externalStorageModel.find({}, { _id: 1, name: 1, kind: 1, folderName: 1, publicUrl: 1 }).lean().exec();
    return storages;
  }

  async findOne(id: string) {
    const storage = await this.externalStorageModel.findById(id, { _id: 1, name: 1, kind: 1, folderName: 1, publicUrl: 1 }).lean().exec();
    if (!storage)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
    return storage;
  }

  async update(id: string, updateStorageDto: UpdateStorageDto) {
    const storage = await this.externalStorageModel.findById(id).exec();
    if (!storage)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
    const stringCrypto = new StringCrypto(process.env.CRYPTO_SECRET_KEY);
    updateStorageDto.name != undefined && (storage.name = updateStorageDto.name);
    updateStorageDto.kind != undefined && (storage.kind = updateStorageDto.kind);
    updateStorageDto.accessToken !== undefined && (storage.accessToken = await stringCrypto.encrypt(updateStorageDto.accessToken));
    updateStorageDto.refreshToken != undefined && (storage.refreshToken = await stringCrypto.encrypt(updateStorageDto.refreshToken));
    updateStorageDto.expiresAt !== undefined && (storage.expiresAt = updateStorageDto.expiresAt);
    updateStorageDto.folderId !== undefined && (storage.folderId = updateStorageDto.folderId);
    updateStorageDto.folderName !== undefined && (storage.folderName = updateStorageDto.folderName);
    updateStorageDto.publicUrl !== undefined && (storage.publicUrl = updateStorageDto.publicUrl);
    const result = await storage.save();
    if (storage.kind === CloudStorage.IMGUR)
      await this.settingsService.updateMediaImageStorage(storage._id);
    return plainToClass(ExternalStorageEntity, result.toObject());
  }

  async remove(id: string) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const storage = await this.externalStorageModel.findByIdAndDelete(id).lean().exec();
      if (!storage)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
      if (storage.kind === CloudStorage.IMGUR)
        await this.settingsService.deleteMediaImageStorage(id, session);
      else if (storage.kind === CloudStorage.GOOGLE_DRIVE)
        await this.settingsService.deleteGoogleDriveStorage(id, session);
    });
  }

  findByName(name: string) {
    return this.externalStorageModel.findOne({ name }).lean().exec();
  }

  findImgurStorageById(id: string) {
    return this.externalStorageModel.findOne({ $and: [{ _id: id }, { kind: CloudStorage.IMGUR }] }).lean().exec();
  }

  finGoogleDriveStoragedByIds(ids: string[]) {
    return this.externalStorageModel.find({ $and: [{ _id: { $in: ids } }, { kind: CloudStorage.GOOGLE_DRIVE }] }).lean().exec();
  }

  async decryptToken(storage: ExternalStorage) {
    const stringCrypto = new StringCrypto(process.env.CRYPTO_SECRET_KEY);
    if (storage.accessToken)
      storage.accessToken = await stringCrypto.decrypt(storage.accessToken);
    storage.refreshToken = await stringCrypto.decrypt(storage.refreshToken);
    return storage;
  }

  updateToken(id: string, accessToken: string, refreshToken: string, expiresAt: Date) {
    return this.externalStorageModel.findByIdAndUpdate(id, { accessToken, refreshToken, expiresAt }, { new: true }).lean().exec();
  }
}
