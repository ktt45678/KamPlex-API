import { Transform, Type } from 'class-transformer';

import { MediaQueueAdvancedDto } from './media-queue-advanced.dto';
import { transformBigInt } from '../../../utils';

export class MediaQueueDataDto {
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  _id: bigint;

  filename: string;

  path: string;

  size: number;

  mimeType: string;

  producerUrl: string;

  @Type(() => MediaQueueAdvancedDto)
  advancedOptions: MediaQueueAdvancedDto;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  storage: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  linkedStorage?: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  user: bigint;

  update?: boolean;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  replaceStreams?: bigint[];
}
