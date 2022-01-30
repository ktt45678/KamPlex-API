import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserAvatarDocument = UserAvatar & Document;

@Schema()
export class UserAvatar {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: number;

  @Prop({ required: true })
  mimeType: string;
}

export const UserAvatarSchema = SchemaFactory.createForClass(UserAvatar);
