import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserFileDocument = HydratedDocument<UserFile>;

@Schema()
export class UserFile {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: number;

  @Prop({ required: true })
  placeholder: string;

  @Prop({ required: true })
  mimeType: string;
}

export const UserFileSchema = SchemaFactory.createForClass(UserFile);
