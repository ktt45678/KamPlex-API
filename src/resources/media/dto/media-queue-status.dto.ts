import { Transform } from 'class-transformer';

import { transformBigInt } from '../../../utils';

export class MediaQueueStatusDto {
  code: string;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  _id: bigint;

  filename: string;

  size: number;

  mimeType: string;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  storage: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  media: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  episode?: bigint;

  isPrimary: boolean;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  user: bigint;

  update?: boolean;

  cancel?: boolean;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  replaceStreams?: bigint[];
}
