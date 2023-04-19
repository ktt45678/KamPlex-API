import { Transform } from 'class-transformer';

import { transformBigInt } from '../../../utils';

export class MediaQueueUserDto {
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  _id: string;
}
