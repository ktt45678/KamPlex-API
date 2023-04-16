import { Transform } from 'class-transformer';

import { QueueProgressCode } from '../../../enums';

export class AddMediaStreamDto {
  code: QueueProgressCode;

  @Transform(({ value }) => BigInt(value))
  sourceId: bigint;

  @Transform(({ value }) => BigInt(value))
  streamId: bigint;

  fileName: string;

  codec: number;

  runtime: number;

  quality: number;

  @Transform(({ value }) => BigInt(value))
  media: bigint;

  @Transform(({ value }) => BigInt(value))
  episode?: bigint;

  @Transform(({ value }) => BigInt(value))
  storage: bigint;
}
