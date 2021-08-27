import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { User } from './user.schema';
import { ExternalStorage } from './external-storage.schema';
import { BalancedStorage } from './balanced-storage.schema';

export type SettingDocument = Setting & Document;

@Schema()
export class Setting {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, type: String, ref: 'User' })
  owner: User;

  @Prop({ type: String, ref: 'ExternalStorage' })
  mediaPosterStorage: ExternalStorage;

  @Prop({ type: String, ref: 'ExternalStorage' })
  mediaBackdropStorage: ExternalStorage;

  @Prop([BalancedStorage])
  mediaSourceStorages: BalancedStorage[];
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
