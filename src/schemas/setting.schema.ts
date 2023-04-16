import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

import { User } from './user.schema';
import { ExternalStorage } from './external-storage.schema';
import { EncodingSetting, EncodingSettingSchema } from './encoding-setting.schema';
import { TrackableDoc } from './trackable-doc.schema';

export type SettingDocument = Setting & Document;

@Schema()
export class Setting extends TrackableDoc<Setting> {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
  owner: User;

  @Prop({ type: () => BigInt, ref: 'ExternalStorage' })
  mediaPosterStorage: ExternalStorage;

  @Prop({ type: () => BigInt, ref: 'ExternalStorage' })
  mediaBackdropStorage: ExternalStorage;

  @Prop({ type: () => BigInt, ref: 'ExternalStorage' })
  tvEpisodeStillStorage: ExternalStorage;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'ExternalStorage' }] })
  mediaSourceStorages: Types.Array<ExternalStorage>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'ExternalStorage' }] })
  mediaSubtitleStorages: Types.Array<ExternalStorage>;

  @Prop({ required: true, default: 0 })
  defaultStreamCodecs: number;

  @Prop()
  streamAudioParams: string;

  @Prop()
  streamAudio2Params: string;

  @Prop()
  streamH264Params: string;

  @Prop()
  streamVP9Params: string;

  @Prop()
  streamAV1Params: string;

  @Prop()
  streamQualityList: number[];

  @Prop({ type: [EncodingSettingSchema] })
  streamEncodingSettings: Types.Array<EncodingSetting>;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);

SettingSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});
