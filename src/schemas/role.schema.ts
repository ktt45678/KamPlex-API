import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { User } from './user.schema';
import { Counter } from './counter.schema';
import { MongooseIncrementId } from '../enums/mongoose-increment-id.enum';

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
  users: User[];

  @Prop({ required: true, defaults: 0 })
  permissions: number;

  @Prop()
  position: number;

  createdAt: Date;

  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ name: 1 });
RoleSchema.index({ position: 1 });

RoleSchema.pre('save', async function (next) {
  if (!this.isNew)
    return next();
  try {
    const counter = await this.model(Counter.name).findByIdAndUpdate(MongooseIncrementId.ROLE_POSITION, { $inc: { seq: 1 } }, { new: true, upsert: true }).exec();
    (<any>this).position = counter.seq;
    next();
  } catch (e) {
    next(e)
  }
});