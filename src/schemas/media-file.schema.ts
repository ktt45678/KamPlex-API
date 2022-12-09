import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaFileType } from '../enums';
import { MEDIA_FILE_TYPES } from '../config';

export type MediaFileDocument = MediaFile & Document;

@Schema()
export class MediaFile {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, enum: MEDIA_FILE_TYPES })
  type: number;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: function () {
      return this.type === MediaFileType.POSTER || this.type === MediaFileType.BACKDROP || this.type === MediaFileType.STILL;
    }
  })
  color: number;

  @Prop({
    required: function () {
      return this.type === MediaFileType.SUBTITLE;
    }
  })
  language: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);
