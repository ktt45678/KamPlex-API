import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AuditLogChangeDocument = HydratedDocument<AuditLogChange>;

@Schema({ _id: false })
export class AuditLogChange {
  @Prop({ required: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  newValue: string | number | boolean | bigint;

  @Prop({ type: MongooseSchema.Types.Mixed })
  oldValue: string | number | boolean | bigint;
}

export const AuditLogChangeSchema = SchemaFactory.createForClass(AuditLogChange);
