import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { ClientSession, Connection, Model } from 'mongoose';

import { ExternalStorage, ExternalStorageDocument } from '../../schemas/external-storage.schema';
import { createSnowFlakeIdAsync, StringCrypto } from '../../utils';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SettingsService } from '../settings/settings.service';
import { AuthUserDto } from '../users/dto/auth-user.dto';
import { AddStorageDto } from './dto/add-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import { ExternalStorage as ExternalStorageEntity } from './entities/external-storage.entity';
import { AuditLogType, CloudStorage, MediaStorageType, MongooseConnection, StatusCode } from '../../enums';
import { EXTERNAL_STORAGE_LIMIT } from '../../config';

@Injectable()
export class ExternalStoragesService {
  constructor(@InjectModel(ExternalStorage.name) private externalStorageModel: Model<ExternalStorageDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection, private auditLogService: AuditLogService,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService, private configService: ConfigService) { }

  async create(addStorageDto: AddStorageDto, authUser: AuthUserDto) {
    const totalStorage = await this.externalStorageModel.estimatedDocumentCount().exec();
    if (totalStorage >= EXTERNAL_STORAGE_LIMIT)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_LIMIT, message: 'External storage limit reached' }, HttpStatus.BAD_REQUEST);
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    const storage = new this.externalStorageModel({
      name: addStorageDto.name,
      kind: addStorageDto.kind,
      refreshToken: await stringCrypto.encrypt(addStorageDto.refreshToken)
    });
    storage._id = await createSnowFlakeIdAsync();
    addStorageDto.accessToken !== undefined && (storage.accessToken = await stringCrypto.encrypt(addStorageDto.accessToken));
    addStorageDto.expiry !== undefined && (storage.expiry = addStorageDto.expiry);
    addStorageDto.folderId !== undefined && (storage.folderId = addStorageDto.folderId);
    addStorageDto.folderName !== undefined && (storage.folderName = addStorageDto.folderName);
    addStorageDto.publicUrl !== undefined && (storage.publicUrl = addStorageDto.publicUrl);
    await Promise.all([
      storage.save(),
      this.auditLogService.createLog(authUser._id, storage._id, ExternalStorage.name, AuditLogType.EXTERNAL_STORAGE_CREATE)
    ])
    return plainToClass(ExternalStorageEntity, storage.toObject());
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

  async update(id: string, updateStorageDto: UpdateStorageDto, authUser: AuthUserDto) {
    if (!Object.keys(updateStorageDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const storage = await this.externalStorageModel.findById(id).exec();
    if (!storage)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    updateStorageDto.name != undefined && (storage.name = updateStorageDto.name);
    updateStorageDto.kind != undefined && (storage.kind = updateStorageDto.kind);
    updateStorageDto.accessToken !== undefined && (storage.accessToken = await stringCrypto.encrypt(updateStorageDto.accessToken));
    updateStorageDto.refreshToken != undefined && (storage.refreshToken = await stringCrypto.encrypt(updateStorageDto.refreshToken));
    updateStorageDto.expiry !== undefined && (storage.expiry = updateStorageDto.expiry);
    updateStorageDto.folderId !== undefined && (storage.folderId = updateStorageDto.folderId);
    updateStorageDto.folderName !== undefined && (storage.folderName = updateStorageDto.folderName);
    updateStorageDto.publicUrl !== undefined && (storage.publicUrl = updateStorageDto.publicUrl);
    await Promise.all([
      storage.save(),
      this.auditLogService.createLog(authUser._id, storage._id, ExternalStorage.name, AuditLogType.EXTERNAL_STORAGE_UPDATE)
    ]);
    switch (storage.inStorage) {
      case MediaStorageType.SOURCE:
        await this.settingsService.clearMediaSourceCache();
        break;
    }
    return plainToClass(ExternalStorageEntity, storage.toObject());
  }

  async remove(id: string, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const storage = await this.externalStorageModel.findByIdAndDelete(id, { session }).lean();
      if (!storage)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
      if (storage.files?.length)
        throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_FILES_EXIST, message: 'You cannot delete a storage that contains files' }, HttpStatus.FORBIDDEN);
      switch (storage.inStorage) {
        case MediaStorageType.SOURCE:
          await this.settingsService.deleteMediaSourceStorage(storage._id, session);
          break;
      }
      await this.auditLogService.createLog(authUser._id, storage._id, ExternalStorage.name, AuditLogType.EXTERNAL_STORAGE_DELETE);
    });
  }

  findByName(name: string) {
    return this.externalStorageModel.findOne({ name }).lean().exec();
  }

  findStorageById(id: string) {
    return this.externalStorageModel.findById(id).lean().exec();
  }

  countGoogleDriveStorageByIds(ids: string[]) {
    return this.externalStorageModel.countDocuments({ $and: [{ _id: { $in: ids } }, { kind: CloudStorage.GOOGLE_DRIVE }] }).lean().exec();
  }

  countDropboxStorageByIds(ids: string[]) {
    return this.externalStorageModel.countDocuments({ $and: [{ _id: { $in: ids } }, { kind: CloudStorage.DROPBOX }] }).lean().exec();
  }

  addSettingStorage(id: string, inStorage: number, session: ClientSession) {
    if (id)
      return this.externalStorageModel.updateOne({ _id: id }, { inStorage }, { session });
  }

  addSettingStorages(ids: string[], inStorage: number, session: ClientSession) {
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

  addFileToStorage(id: string, fileId: string, fileSize: number, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $push: { files: fileId }, $inc: { used: fileSize } }, { session });
  }

  deleteFileFromStorage(id: string, fileId: string, fileSize: number, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $pull: { files: fileId }, $inc: { used: -fileSize } }, { session });
  }

  async decryptToken(storage: ExternalStorageEntity) {
    if (storage._decrypted)
      return;
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    if (storage.accessToken)
      storage.accessToken = await stringCrypto.decrypt(storage.accessToken);
    storage.refreshToken = await stringCrypto.decrypt(storage.refreshToken);
    storage._decrypted = true;
    return storage;
  }

  async updateToken(id: string, accessToken: string, expiry: Date, refreshToken?: string) {
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    const update = new ExternalStorage();
    update.accessToken = await stringCrypto.encrypt(accessToken);
    update.expiry = expiry;
    refreshToken != undefined && (update.refreshToken = await stringCrypto.encrypt(refreshToken));
    return this.externalStorageModel.findByIdAndUpdate(id, update, { new: true }).lean().exec();
  }
}
