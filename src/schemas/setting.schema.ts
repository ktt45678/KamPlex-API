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

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'ExternalStorage' }] })
  linkedMediaSourceStorages: Types.Array<ExternalStorage>;

  @Prop({ required: true, default: 0 })
  defaultVideoCodecs: number;

  @Prop()
  audioParams: string;

  @Prop()
  audioSpeedParams: string;

  @Prop()
  audioSurroundParams: string;

  @Prop()
  videoH264Params: string;

  @Prop()
  videoH265Params: string;

  @Prop()
  videoVP9Params: string;

  @Prop()
  videoAV1Params: string;

  @Prop()
  videoQualityList: number[];

  @Prop()
  videoNextGenQualityList: number[];

  @Prop({ type: [EncodingSettingSchema] })
  videoEncodingSettings: Types.DocumentArray<EncodingSetting>;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);

SettingSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});
