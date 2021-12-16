import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { USER_FILE_STORAGE } from '../config';

export type UserAvatarDocument = UserAvatar & Document;

@Schema()
export class UserAvatar {
  @Prop({ required: true })
  _id: string;

  @Prop({ enum: USER_FILE_STORAGE })
  storage: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: number;

  @Prop({ required: true })
  mimeType: string;
}

export const UserAvatarSchema = SchemaFactory.createForClass(UserAvatar);
