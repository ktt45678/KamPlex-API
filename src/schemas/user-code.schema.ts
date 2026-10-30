import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserCodeDocument = HydratedDocument<UserCode>;

@Schema({ _id: false })
export class UserCode {
  @Prop({ unique: true, sparse: true })
  activationCode: string;

  @Prop({ unique: true, sparse: true })
  recoveryCode: string;
}

export const UserCodeSchema = SchemaFactory.createForClass(UserCode);
