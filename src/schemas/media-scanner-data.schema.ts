import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class MediaScannerData {
  @Prop()
  enabled: boolean;

  @Prop()
  tvSeason: number;
}

export const MediaScannerDataSchema = SchemaFactory.createForClass(MediaScannerData);
