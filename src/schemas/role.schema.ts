import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

import { TrackableDoc } from './trackable-doc.schema';
import { User } from './user.schema';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role extends TrackableDoc<Role> {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  name: string;

  @Prop()
  color: number;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'User' }] })
  users: Types.Array<User>;

  @Prop({ required: true, defaults: 0 })
  permissions: number;

  @Prop({ required: true })
  position: number;

  createdAt: Date;

  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ name: 1 });
RoleSchema.index({ position: 1 });

RoleSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});
