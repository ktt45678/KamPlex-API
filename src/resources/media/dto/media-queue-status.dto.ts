import { Transform, Type } from 'class-transformer';

import { MediaQueueUserDto } from './media-queue-user.dto';

export class MediaQueueStatusDto {
  code: string;

  @Transform(({ value }) => BigInt(value))
  _id: bigint;

  filename: string;

  size: number;

  mimeType: string;

  @Transform(({ value }) => BigInt(value))
  storage: bigint;

  @Transform(({ value }) => BigInt(value))
  media: bigint;

  @Transform(({ value }) => BigInt(value))
  episode?: bigint;

  isPrimary: boolean;

  @Type(() => MediaQueueUserDto)
  user: MediaQueueUserDto;

  cancel?: boolean;
}
