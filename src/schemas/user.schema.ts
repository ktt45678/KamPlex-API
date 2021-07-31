import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true, sparse: true })
  username: string;

  @Prop({ required: true, unique: true, sparse: true })
  email: string;

  @Prop()
  displayName: string;

  @Prop()
  dateOfBirth: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true, default: false })
  isEmailConfirmed: boolean;

  @Prop({ required: true, unique: true, sparse: true })
  activationCode: string;

  @Prop({ required: true, unique: true, sparse: true })
  recoveryCode: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
