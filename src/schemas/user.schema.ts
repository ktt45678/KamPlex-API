import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { UserCode } from './user-code.schema';
import { UserFile } from './user-file.schema';
import { Role } from './role.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, unique: true, sparse: true })
  username: string;

  @Prop({ required: true, unique: true, sparse: true })
  email: string;

  @Prop()
  displayName: string;

  @Prop({ required: true })
  birthdate: Date;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [{ type: String, ref: 'Role' }] })
  roles: Role[];

  @Prop({ required: true, default: false })
  isVerified: boolean;

  @Prop({ required: true, default: false })
  isBanned: boolean;

  @Prop({ default: {} })
  codes: UserCode;

  @Prop()
  files: UserFile[];

  @Prop({ required: true, default: Date.now })
  lastActiveAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
