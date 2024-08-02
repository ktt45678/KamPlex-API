import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { EncodingSetting, EncodingSettingSchema } from './encoding-setting.schema';

@Schema({ _id: false })
export class MediaSourceOptions {
  @Prop()
  selectAudioTracks?: number[];

  @Prop()
  extraAudioTracks?: number[];

  @Prop()
  forceVideoQuality?: number[];

  @Prop()
  h264Tune?: string;

  @Prop()
  queuePriority?: number;

  @Prop({ type: [EncodingSettingSchema] })
  overrideSettings?: Types.Array<EncodingSetting>;
}

export const MediaSourceOptionsSchema = SchemaFactory.createForClass(MediaSourceOptions);
