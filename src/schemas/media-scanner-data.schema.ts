import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class MediaScannerData {
  @Prop()
  enabled: boolean;

  @Prop()
  tvSeason: number;
}
