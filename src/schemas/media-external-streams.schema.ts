import { Prop, Schema } from '@nestjs/mongoose';

//export type MediaExternalStreamDocument = MediaExternalStream & Document;

@Schema({ _id: false })
export class MediaExternalStreams {
  @Prop()
  gogoanimeId: string;

  @Prop()
  flixHQId: string;

  @Prop()
  zoroId: string;
}

//export const MediaExternalStreamSchema = SchemaFactory.createForClass(MediaExternalStream);
