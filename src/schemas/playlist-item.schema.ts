import { Prop, Schema } from '@nestjs/mongoose';

import { Media } from './media.schema';

@Schema()
export class PlaylistItem {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  @Prop({ required: true })
  position: number;

  @Prop({ default: Date.now })
  addedAt: Date;
}
