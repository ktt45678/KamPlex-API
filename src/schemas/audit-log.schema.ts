import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { User } from './user.schema';
import { ExternalStorage } from './external-storage.schema';
import { Genre } from './genre.schema';
import { MediaCollection } from './media-collection.schema';
import { MediaStorage } from './media-storage.schema';
import { MediaTag } from './media-tag.schema';
import { ChapterType } from './chapter-type.schema';
import { Media } from './media.schema';
import { Production } from './production.schema';
import { Role } from './role.schema';
import { Setting } from './setting.schema';
import { TVEpisode } from './tv-episode.schema';
import { AuditLogChange, AuditLogChangeSchema } from './audit-log-change.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema()
export class AuditLog {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
  user: User;

  @Prop({ required: true, type: () => BigInt, refPath: 'targetRef' })
  target: bigint;

  @Prop({
    required: true,
    enum: [
      ExternalStorage.name, Genre.name, Production.name, MediaCollection.name, MediaTag.name, ChapterType.name, Media.name,
      MediaStorage.name, TVEpisode.name, Role.name, Setting.name, User.name
    ]
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
