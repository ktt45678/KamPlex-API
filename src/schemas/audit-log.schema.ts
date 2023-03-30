import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { User } from './user.schema';
import { AuditLogChange, AuditLogChangeSchema } from './audit-log-change.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema()
export class AuditLog {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, type: String, ref: 'User' })
  user: User;

  @Prop({ required: true, refPath: 'targetRef' })
  target: string;

  @Prop({
    required: true,
    enum: [
      'ExternalStorage', 'Genre', 'Production', 'MediaCollection', 'MediaTag', 'Media', 'MediaStorage', 'TVEpisode', 'Role',
      'Setting', 'User']
  })
  targetRef: string;

  @Prop({ required: true })
  type: number;

  @Prop({ type: [AuditLogChangeSchema] })
  changes: Types.Array<AuditLogChange>;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
