import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class AddPlaylistItemDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  mediaId: bigint;
}
