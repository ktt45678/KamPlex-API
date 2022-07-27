import { Prop, Schema } from '@nestjs/mongoose';

//export type MediaExternalStreamDocument = MediaExternalStream & Document;

@Schema({ _id: false })
export class MediaExternalStreams {
  @Prop()
  gogoanimeId: string;

  @Prop({ required: function () { return this.flixHQEpId != null; } })
  flixHQId: string;

  @Prop({ required: function () { return this.flixHQId != null; } })
  flixHQEpId: string;
}

//export const MediaExternalStreamSchema = SchemaFactory.createForClass(MediaExternalStream);
