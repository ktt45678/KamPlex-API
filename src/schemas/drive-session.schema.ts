import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';
import { User } from './user.schema';
import { MediaSourceOptions, MediaSourceOptionsSchema } from './media-source-options.schema';

export type DriveSessionDocument = HydratedDocument<DriveSession>;

@Schema()
export class DriveSession {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ type: MediaSourceOptionsSchema })
  options: MediaSourceOptions;

  @Prop({ required: true, type: () => BigInt, ref: 'ExternalStorage' })
  storage: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
  user: bigint;

  @Prop({ required: true })
  expiry: Date;

  @Prop()
  uploadId: string;
}

export const DriveSessionSchema = SchemaFactory.createForClass(DriveSession);
