import { Transform } from 'class-transformer';

import { transformBigInt } from '../../../utils';

export class MediaQueueDataDto {
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  _id: bigint;

  filename: string;

  size: number;

  mimeType: string;

  producerUrl: string;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  storage: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  user: bigint;

  update?: boolean;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  replaceStreams?: bigint[];
}
