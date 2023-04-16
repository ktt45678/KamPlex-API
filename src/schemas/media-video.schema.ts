import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { Translations } from './translations.schema';

export type MediaVideoDocument = MediaVideo & Document;

@Schema()
export class MediaVideo {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  site: string;

  @Prop()
  name: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true, default: false })
  official: boolean;

  @Prop({ default: {} })
  _translations: Translations<TranslatedVideo>;
}

export const MediaVideoSchema = SchemaFactory.createForClass(MediaVideo);

export class TranslatedVideo {
  @Prop()
  name: string;
}
