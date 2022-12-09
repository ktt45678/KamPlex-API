import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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

export const MediaExternalStreamsSchema = SchemaFactory.createForClass(MediaExternalStreams);
