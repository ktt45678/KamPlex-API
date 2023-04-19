import { Transform } from 'class-transformer';

import { QueueProgressCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class AddMediaStreamDto {
  code: QueueProgressCode;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  sourceId: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  streamId: bigint;

  fileName: string;

  codec: number;

  runtime: number;

  quality: number;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  media: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  episode?: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  storage: bigint;
}
