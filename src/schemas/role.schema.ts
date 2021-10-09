import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { User } from './user.schema';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  color: number;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  users: Types.Array<User>;

  @Prop({ required: true, defaults: 0 })
  permissions: number;

  @Prop()
  position: number;

  createdAt: Date;

  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ name: 1, position: 1 });
RoleSchema.index({ position: 1 });