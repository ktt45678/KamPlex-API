import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserFileDocument = UserFile & Document;

@Schema()
export class UserFile {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: number;

  @Prop({ required: true })
  mimeType: string;
}

export const UserFileSchema = SchemaFactory.createForClass(UserFile);
