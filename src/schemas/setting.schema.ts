import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { User } from './user.schema';

export type SettingDocument = Setting & Document;

@Schema()
export class Setting {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ type: String, ref: 'User' })
  owner: User;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
