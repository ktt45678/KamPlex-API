import { Transform } from 'class-transformer';

import { transformBigInt } from '../../../utils';

export class AddMediaStreamDto {
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  sourceId: bigint;

  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  streamId: bigint;

  fileName: string;

  codec: number;

  runtime?: number;

  quality?: number;

  channels?: number;
}
