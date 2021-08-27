import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';

export type BalancedStorageDocument = BalancedStorage & Document;

@Schema({ _id: false, versionKey: false })
export class BalancedStorage {
  @Prop({ required: true, default: 0 })
  used: number;

  @Prop({ required: true, type: String, ref: 'ExternalStorage' })
  source: ExternalStorage
}

export const BalancedStorageSchema = SchemaFactory.createForClass(BalancedStorage);
