import { Prop, Schema } from '@nestjs/mongoose';

//export type MediaExternalIdDocument = MediaExternalId & Document;

@Schema({ _id: false })
export class MediaExternalIds {
  @Prop()
  imdb: string;

  @Prop()
  tmdb: number;
}

//export const MediaExternalIdSchema = SchemaFactory.createForClass(MediaExternalId);
