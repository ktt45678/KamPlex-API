import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserCodeDocument = UserCode & Document;

@Schema()
export class UserCode {
  @Prop({ unique: true, sparse: true })
  activationCode: string;

  @Prop({ unique: true, sparse: true })
  recoveryCode: string;
}

export const UserCodeSchema = SchemaFactory.createForClass(UserCode);
