import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

import { Media } from './media.schema';
import { Translations } from './translations.schema';

export type MediaTagDocument = MediaTag & Document;

@Schema({ timestamps: true })
export class MediaTag {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  media: Types.Array<Media>;

  @Prop({ default: {} })
  _translations: Translations<TranslatedMediaTag>;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaTagSchema = SchemaFactory.createForClass(MediaTag);

MediaTagSchema.index({ '_translations.vi.name': 1 }, { unique: true, sparse: true });

export class TranslatedMediaTag {
  @Prop()
  name: string;
}
