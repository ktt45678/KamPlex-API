import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Media } from './media.schema';

@Schema()
export class PlaylistItem {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'Media' })
  media: Media;

  @Prop({ required: true })
  position: number;

  @Prop({ default: Date.now })
  addedAt: Date;
}

export const PlaylistItemSchema = SchemaFactory.createForClass(PlaylistItem);
