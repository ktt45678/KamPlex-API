import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { ClientSession, Connection, Model } from 'mongoose';

import { ExternalStorage, ExternalStorageDocument } from '../../schemas';
import { OnedriveService } from '../../common/modules/onedrive/onedrive.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SettingsService } from '../settings/settings.service';
import { AddStorageDto, UpdateStorageDto } from './dto';
import { AuthUserDto } from '../users/dto';
import { ExternalStorage as ExternalStorageEntity } from './entities';
import { AuditLogBuilder, createSnowFlakeId, StringCrypto } from '../../utils';
import { AuditLogType, CloudStorage, MediaStorageType, MongooseConnection, StatusCode } from '../../enums';
import { EXTERNAL_STORAGE_LIMIT } from '../../config';

@Injectable()
export class ExternalStoragesService {
  private readonly logger = new Logger(ExternalStoragesService.name);

  constructor(@InjectModel(ExternalStorage.name, MongooseConnection.DATABASE_A) private externalStorageModel: Model<ExternalStorageDocument>,
    @InjectConnection(MongooseConnection.DATABASE_A) private mongooseConnection: Connection, private auditLogService: AuditLogService,
    @Inject(forwardRef(() => OnedriveService)) private onedriveService: OnedriveService,
    @Inject(forwardRef(() => SettingsService)) private settingsService: SettingsService,
    private configService: ConfigService) { }

  async create(addStorageDto: AddStorageDto, authUser: AuthUserDto) {
    const totalStorage = await this.externalStorageModel.estimatedDocumentCount().exec();
    if (totalStorage >= EXTERNAL_STORAGE_LIMIT)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_LIMIT, message: 'External storage limit reached' }, HttpStatus.BAD_REQUEST);
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    const storage = new this.externalStorageModel({
      _id: await createSnowFlakeId(),
      name: addStorageDto.name,
      kind: addStorageDto.kind,
      clientId: addStorageDto.clientId,
      clientSecret: await stringCrypto.encrypt(addStorageDto.clientSecret),
      refreshToken: addStorageDto.refreshToken
    });
    addStorageDto.accessToken !== undefined && (storage.accessToken = addStorageDto.accessToken);
    addStorageDto.expiry !== undefined && (storage.expiry = addStorageDto.expiry);
    const auditLog = new AuditLogBuilder(authUser._id, storage._id, ExternalStorage.name, AuditLogType.EXTERNAL_STORAGE_CREATE);
    auditLog.appendChange('name', addStorageDto.name);
    auditLog.appendChange('kind', addStorageDto.kind);
    auditLog.appendChange('clientId', addStorageDto.clientId);
    if (addStorageDto.folderId !== undefined) {
      storage.folderId = addStorageDto.folderId;
      auditLog.appendChange('folderId', addStorageDto.folderId);
    }
    if (addStorageDto.folderName !== undefined) {
      storage.folderName = addStorageDto.folderName;
      auditLog.appendChange('folderName', addStorageDto.folderName);
    }
    if (addStorageDto.publicUrl !== undefined) {
      storage.publicUrl = addStorageDto.publicUrl;
      auditLog.appendChange('publicUrl', addStorageDto.publicUrl);
    }
    if (addStorageDto.secondPublicUrl !== undefined) {
      storage.secondPublicUrl = addStorageDto.secondPublicUrl;
      auditLog.appendChange('secondPublicUrl', addStorageDto.secondPublicUrl);
    }
    await Promise.all([
      storage.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ])
    return plainToInstance(ExternalStorageEntity, storage.toObject());
  }

  async findAll() {
    const storages = await this.externalStorageModel.find({},
      { _id: 1, name: 1, kind: 1, folderName: 1, publicUrl: 1, secondPublicUrl: 1, files: 1 }
    ).lean().exec();
    return plainToInstance(ExternalStorageEntity, storages);
  }

  async findOne(id: bigint) {
    const storage = await this.externalStorageModel.findOne({ _id: id }, { _id: 1, name: 1, kind: 1, folderName: 1, publicUrl: 1, files: 1 }).lean().exec();
    if (!storage)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
    // Decrypt client secret
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    storage.clientSecret = await stringCrypto.decrypt(storage.clientSecret);
    return plainToInstance(ExternalStorageEntity, storage);
  }

  async update(id: bigint, updateStorageDto: UpdateStorageDto, authUser: AuthUserDto) {
    if (!Object.keys(updateStorageDto).length)
      throw new HttpException({ code: StatusCode.EMPTY_BODY, message: 'Nothing to update' }, HttpStatus.BAD_REQUEST);
    const storage = await this.externalStorageModel.findOne({ _id: id }).exec();
    if (!storage)
      throw new HttpException({ code: StatusCode.EXTERNAL_STORAGE_NOT_FOUND, message: 'Storage not found' }, HttpStatus.NOT_FOUND);
    const auditLog = new AuditLogBuilder(authUser._id, storage._id, ExternalStorage.name, AuditLogType.EXTERNAL_STORAGE_UPDATE);
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    if (updateStorageDto.name != undefined && storage.name !== updateStorageDto.name) {
      auditLog.appendChange('name', updateStorageDto.name, storage.name);
      storage.name = updateStorageDto.name;
    }
    if (updateStorageDto.kind != undefined && storage.kind !== updateStorageDto.kind) {
      auditLog.appendChange('kind', updateStorageDto.kind, storage.kind);
      storage.kind = updateStorageDto.kind;
    }
    if (updateStorageDto.clientId != undefined && storage.clientId !== updateStorageDto.clientId) {
      auditLog.appendChange('clientId', updateStorageDto.clientId, storage.clientId);
      storage.clientId = updateStorageDto.clientId;
    }
    updateStorageDto.clientSecret !== undefined && (storage.clientSecret = await stringCrypto.encrypt(updateStorageDto.clientSecret));
    updateStorageDto.accessToken !== undefined && (storage.accessToken = updateStorageDto.accessToken);
    updateStorageDto.refreshToken != undefined && (storage.refreshToken = updateStorageDto.refreshToken);
    updateStorageDto.expiry !== undefined && (storage.expiry = updateStorageDto.expiry);
    updateStorageDto.folderId !== undefined && (storage.folderId = updateStorageDto.folderId);
    if (updateStorageDto.folderName !== undefined) {
      auditLog.appendChange('folderName', updateStorageDto.folderName, storage.folderName);
      storage.folderName = updateStorageDto.folderName;
    };
    if (updateStorageDto.publicUrl !== undefined) {
      auditLog.appendChange('publicUrl', updateStorageDto.publicUrl, storage.publicUrl);
      storage.publicUrl = updateStorageDto.publicUrl;
    };
    if (updateStorageDto.secondPublicUrl !== undefined) {
      auditLog.appendChange('secondPublicUrl', updateStorageDto.secondPublicUrl, storage.secondPublicUrl);
      storage.secondPublicUrl = updateStorageDto.secondPublicUrl;
    };
    await Promise.all([
      storage.save(),
      this.auditLogService.createLogFromBuilder(auditLog)
    ]);
    switch (storage.inStorage) {
      case MediaStorageType.SOURCE:
        await this.settingsService.clearMediaSourceCache();
        break;
    }
    return plainToInstance(ExternalStorageEntity, storage.toObject());
  }

  async remove(id: bigint, authUser: AuthUserDto) {
    const session = await this.mongooseConnection.startSession();
    await session.withTransaction(async () => {
      const storage = await this.externalStorageModel.findOneAndDelete({ _id: id }, { session }).lean();
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
    }).finally(() => session.endSession().catch(() => { }));
  }

  @Cron('0 0 */5 * *')
  async handleInactiveRefreshToken() {
    // Runs every 5 days
    // Try to refresh all inactive tokens
    this.logger.log('Running scheduled token refresh');
    const odStorages = await this.externalStorageModel.find({ kind: CloudStorage.ONEDRIVE }, { files: 0 }).lean().exec();
    for (let i = 0; i < odStorages.length; i++) {
      const storage = await this.decryptToken(odStorages[i]);
      try {
        if (!storage.accessToken || storage.expiry < new Date()) {
          await this.onedriveService.refreshToken(storage);
          this.logger.log(`Access token for external storage ${storage.name} has been successfully refreshed`);
        }
      } catch (e) {
        this.logger.error(`Failed to request a token refresh for external storage ${storage.name}`, e);
        continue;
      }
    }
  }

  findByName(name: string) {
    return this.externalStorageModel.findOne({ name }).lean().exec();
  }

  findStorageById(id: bigint) {
    return this.externalStorageModel.findOne({ _id: id }).lean().exec();
  }

  findStoragesByIds(ids: bigint[]) {
    return this.externalStorageModel.find({ _id: { $in: ids } }).lean().exec();
  }

  countGoogleDriveStorageByIds(ids: bigint[]) {
    return this.externalStorageModel.countDocuments({ _id: { $in: ids }, kind: CloudStorage.GOOGLE_DRIVE }).lean().exec();
  }

  countDropboxStorageByIds(ids: bigint[]) {
    return this.externalStorageModel.countDocuments({ _id: { $in: ids }, kind: CloudStorage.DROPBOX }).lean().exec();
  }

  countOneDriveStorageByIds(ids: bigint[]) {
    return <Promise<number>><unknown>this.externalStorageModel.countDocuments({ _id: { $in: ids }, kind: CloudStorage.ONEDRIVE }).lean().exec();
  }

  addSettingStorage(id: bigint, inStorage: number, session: ClientSession) {
    if (id)
      return this.externalStorageModel.updateOne({ _id: id }, { inStorage }, { session });
  }

  addSettingStorages(ids: bigint[], inStorage: number, session: ClientSession) {
    if (ids?.length)
      return this.externalStorageModel.updateMany({ _id: { $in: ids } }, { inStorage }, { session });
  }

  deleteSettingStorage(id: bigint, session: ClientSession) {
    if (id)
      return this.externalStorageModel.updateOne({ _id: id }, { $unset: { inStorage: 1 } }, { session });
  }

  deleteSettingStorages(ids: bigint[], session: ClientSession) {
    if (ids?.length)
      return this.externalStorageModel.updateMany({ _id: { $in: ids } }, { $unset: { inStorage: 1 } }, { session });
  }

  addFileToStorage(id: bigint, fileId: bigint, fileSize: number, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $push: { files: fileId }, $inc: { used: fileSize } }, { session });
  }

  deleteFileFromStorage(id: bigint, fileId: bigint, fileSize: number, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $pull: { files: fileId }, $inc: { used: -fileSize } }, { session });
  }

  updateStorageSize(id: bigint, fileSize: number, session: ClientSession) {
    return this.externalStorageModel.updateOne({ _id: id }, { $inc: { used: fileSize } }, { session });
  }

  async decryptToken(storage: ExternalStorageEntity) {
    if (storage._decrypted)
      return;
    const stringCrypto = new StringCrypto(this.configService.get('CRYPTO_SECRET_KEY'));
    storage.clientSecret = await stringCrypto.decrypt(storage.clientSecret);
    storage._decrypted = true;
    return storage;
  }

  async updateToken(id: bigint, accessToken: string, expiry: Date, refreshToken?: string) {
    const update = new ExternalStorage();
    update.accessToken = accessToken;
    update.expiry = expiry;
    refreshToken != undefined && (update.refreshToken = refreshToken);
    return this.externalStorageModel.findOneAndUpdate({ _id: id }, update, { new: true }).lean().exec();
  }
}
