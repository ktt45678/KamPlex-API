import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class AddPlaylistItemDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  mediaId: bigint;
}
