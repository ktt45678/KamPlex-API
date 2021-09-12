import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { ClientSession, Connection, Model } from 'mongoose';

import { ExternalStorage, ExternalStorageDocument } from '../../schemas/external-storage.schema';
import { StatusCode } from '../../enums/status-code.enum';
import { CloudStorage } from '../../enums/cloud-storage.enum';
import { MongooseConnection } from '../../enums/mongoose-connection.enum';
import { MediaStorageType } from '../../enums/media-storage-type.enum';
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
    const storages = await this.externalStorageModel.find({}, { _id: 1, name: 1, kind: 1, folderName: 1, publicUrl: 1, files: 1 }).lean().exec();
    return plainToClass(ExternalStorageEntity, storages);
  }

  async findOne(id: string) {
    const storage = await this.externalStorageModel.findById(id, { _id: 1, name: 1, kind: 1, folderName: 1, publicUrl: 1, files: 1 }).lean().exec();
    if (!storage)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
    return plainToClass(ExternalStorageEntity, storage);
  }

  async update(id: string, updateStorageDto: UpdateStorageDto) {
    if (!Object.keys(updateStorageDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
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
    switch (storage.inStorage) {
      case MediaStorageType.POSTER:
        await this.settingsService.clearMediaPosterCache();
        break;
      case MediaStorageType.BACKDROP:
        await this.settingsService.clearMediaBackdropCache();
        break;
      case MediaStorageType.SOURCE:
        await this.settingsService.clearMediaSourceCache();
        break;
      case MediaStorageType.SUBTITLE:
        await this.settingsService.clearMediaSubtitleCache();
        break;
    }
    return plainToClass(ExternalStorageEntity, result.toObject());
  }

  async remove(id: string) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const storage = await this.externalStorageModel.findByIdAndDelete(id, { session }).lean();
      if (!storage)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
      if (storage.files?.length)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_FILES_EXIST, message: 'You cannot delete a storage that contains files' }, HttpStatus.FORBIDDEN);
      switch (storage.inStorage) {
        case MediaStorageType.POSTER:
          await this.settingsService.deleteMediaPosterStorage(storage._id, session);
          break;
        case MediaStorageType.BACKDROP:
          await this.settingsService.deleteMediaBackdropStorage(storage._id, session);
          break;
        case MediaStorageType.SOURCE:
          await this.settingsService.deleteMediaSourceStorage(storage._id, session);
          break;
        case MediaStorageType.SUBTITLE:
          await this.settingsService.deleteMediaSubtitleStorage(storage._id, session);
          break;
      }
    });
  }

  findByName(name: string) {
    return this.externalStorageModel.findOne({ name }).lean().exec();
  }

  findImgurStorageById(id: string) {
    return this.externalStorageModel.findOne({ $and: [{ _id: id }, { kind: CloudStorage.IMGUR }] }).lean().exec();
  }

  countGoogleDriveStorageByIds(ids: string[]) {
    return this.externalStorageModel.countDocuments({ $and: [{ _id: { $in: ids } }, { kind: CloudStorage.GOOGLE_DRIVE }] }).lean().exec();
  }

  countDropboxStorageByIds(ids: string[]) {
    return this.externalStorageModel.countDocuments({ $and: [{ _id: { $in: ids } }, { kind: CloudStorage.DROPBOX }] }).lean().exec();
  }

  addSettingStorage(id: string, inStorage: string, session: ClientSession) {
    if (id)
      return this.externalStorageModel.updateOne({ _id: id }, { inStorage }, { session });
  }

  addSettingStorages(ids: string[], inStorage: string, session: ClientSession) {
    if (ids?.length)
      return this.externalStorageModel.updateMany({ _id: { $in: ids } }, { inStorage }, { session });
  }

  deleteSettingStorage(id: string, session: ClientSession) {
    if (id)
      return this.externalStorageModel.updateOne({ _id: id }, { $unset: { inStorage: 1 } }, { session });
  }

  deleteSettingStorages(ids: string[], session: ClientSession) {
    if (ids?.length)
      return this.externalStorageModel.updateMany({ _id: { $in: ids } }, { $unset: { inStorage: 1 } }, { session });
  }

  addFileToStorage(id: string, fileId: string, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $push: { files: fileId } }, { session });
  }

  deleteFileFromStorage(id: string, fileId: string, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $pull: { files: fileId } }, { session });
  }

  async decryptToken(storage: ExternalStorageEntity) {
    const stringCrypto = new StringCrypto(process.env.CRYPTO_SECRET_KEY);
    if (storage.accessToken)
      storage.accessToken = await stringCrypto.decrypt(storage.accessToken);
    storage.refreshToken = await stringCrypto.decrypt(storage.refreshToken);
    return storage;
  }

  async updateToken(id: string, accessToken: string, expiresAt: Date, refreshToken?: string) {
    const stringCrypto = new StringCrypto(process.env.CRYPTO_SECRET_KEY);
    const update = new ExternalStorage();
    update.accessToken = await stringCrypto.encrypt(accessToken);
    update.expiresAt = expiresAt;
    refreshToken != undefined && (update.refreshToken = await stringCrypto.encrypt(refreshToken));
    return this.externalStorageModel.findByIdAndUpdate(id, update, { new: true }).lean().exec();
  }
}
