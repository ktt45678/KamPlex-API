import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TranslationsDocument<T> = Translations<T> & Document;

@Schema({ _id: false })
export class Translations<T> {
  @Prop({ type: MongooseSchema.Types.Mixed })
  vi: T;
}

export const TranslationsSchema = SchemaFactory.createForClass(Translations);
