import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { USER_FILE_STORAGE, USER_FILE_TYPES } from '../config';

export type UserFileDocument = UserFile & Document;

@Schema()
export class UserFile {
  @Prop({ enum: USER_FILE_STORAGE })
  storage: string;

  @Prop({ required: true, unique: true, sparse: true, enum: USER_FILE_TYPES })
  type: string;

  @Prop({ required: true })
  path: string[];

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, default: [] })
  quality: number[];

  @Prop({ required: true })
  mimeType: string;
}

export const UserFileSchema = SchemaFactory.createForClass(UserFile);
