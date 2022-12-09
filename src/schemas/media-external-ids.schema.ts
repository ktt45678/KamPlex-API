import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

//export type MediaExternalIdDocument = MediaExternalId & Document;

@Schema({ _id: false })
export class MediaExternalIds {
  @Prop()
  imdb: string;

  @Prop()
  tmdb: number;

  @Prop()
  aniList: number;

  @Prop()
  mal: number;
}

export const MediaExternalIdsSchema = SchemaFactory.createForClass(MediaExternalIds);
