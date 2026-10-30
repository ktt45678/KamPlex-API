import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { EXTERNAL_STORAGE_KIND, MEDIA_STORAGE_TYPES } from '../config';
import { CloudStorage } from '../enums';

export type ExternalStorageDocument = HydratedDocument<ExternalStorage>;

@Schema()
export class ExternalStorage {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: EXTERNAL_STORAGE_KIND })
  kind: number;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  clientSecret: string;

  @Prop()
  accessToken: string;

  @Prop({ required: function () { return this.kind === CloudStorage.ONEDRIVE } })
  refreshToken: string;

  @Prop()
  expiry: Date;

  @Prop()
  folderId: string;

  @Prop()
  folderName: string;

  @Prop()
  publicUrl: string;

  @Prop()
  secondPublicUrl: string;

  @Prop({ enum: MEDIA_STORAGE_TYPES })
  inStorage: number;

  @Prop({ default: 0 })
  used: number;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'MediaStorage' }] })
  files: Types.Array<bigint>;
}

export const ExternalStorageSchema = SchemaFactory.createForClass(ExternalStorage);
