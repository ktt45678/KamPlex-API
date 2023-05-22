import { Transform, Type } from 'class-transformer';

import { AddMediaStreamDto } from './add-media-stream.dto';
import { transformBigInt } from '../../../utils';

export class MediaQueueResultDto {
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  _id: bigint;

  jobId: number | string;

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

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  replaceStreams?: bigint[];

  @Type(() => AddMediaStreamDto)
  progress: AddMediaStreamDto;

  errorCode?: string;

  keepStreams?: boolean;
}
