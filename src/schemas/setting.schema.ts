import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { User } from './user.schema';
import { ExternalStorage } from './external-storage.schema';

export type SettingDocument = Setting & Document;

@Schema()
export class Setting {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, type: String, ref: 'User' })
  owner: User;

  @Prop({ type: String, ref: 'ExternalStorage' })
  mediaPosterStorage: ExternalStorage;

  @Prop({ type: String, ref: 'ExternalStorage' })
  mediaBackdropStorage: ExternalStorage;

  @Prop({ type: String, ref: 'ExternalStorage' })
  tvEpisodeStillStorage: ExternalStorage;

  @Prop({ type: [{ type: String, ref: 'ExternalStorage' }] })
  mediaSourceStorages: Types.Array<ExternalStorage>;

  @Prop({ type: [{ type: String, ref: 'ExternalStorage' }] })
  mediaSubtitleStorages: Types.Array<ExternalStorage>;

  @Prop({ required: true, default: 0 })
  defaultStreamCodecs: number;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
