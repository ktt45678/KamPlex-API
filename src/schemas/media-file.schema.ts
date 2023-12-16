import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaFileType } from '../enums';
import { MEDIA_FILE_TYPES } from '../config';

export type MediaFileDocument = MediaFile & Document;

@Schema()
export class MediaFile {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, enum: MEDIA_FILE_TYPES })
  type: number;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: function () {
      return [MediaFileType.POSTER, MediaFileType.BACKDROP, MediaFileType.STILL, MediaFileType.PLAYLIST_THUMBNAIL].includes(this.type);
    }
  })
  color: number;

  @Prop({
    required: function () {
      return [MediaFileType.POSTER, MediaFileType.BACKDROP, MediaFileType.STILL, MediaFileType.PLAYLIST_THUMBNAIL].includes(this.type);
    }
  })
  placeholder: string;

  @Prop({
    required: function () {
      return this.type === MediaFileType.SUBTITLE;
    }
  })
  lang: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);
