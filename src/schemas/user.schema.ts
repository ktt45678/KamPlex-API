import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { UserCode } from './user-code.schema';
import { UserAvatar } from './user-avatar.schema';
import { Role } from './role.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  displayName: string;

  @Prop({ required: true })
  birthdate: Date;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [{ type: String, ref: 'Role' }] })
  roles: Types.Array<Role>;

  @Prop({ required: true, default: false })
  verified: boolean;

  @Prop({ required: true, default: false })
  banned: boolean;

  @Prop({ default: {} })
  codes: UserCode;

  @Prop()
  avatar: UserAvatar;

  @Prop({ required: true, default: Date.now })
  lastActiveAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);