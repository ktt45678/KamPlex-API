import { Transform } from 'class-transformer';

export class MediaQueueUserDto {
  @Transform(({ value }) => BigInt(value))
  _id: string;

  username: string;

  email: string;

  nickname?: string;
}
