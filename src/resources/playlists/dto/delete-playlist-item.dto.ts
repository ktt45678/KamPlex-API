import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { transformBigInt } from '../../../utils';

export class DeletePlaylistItemDto {
  @ApiProperty({
    type: String,
    description: 'Item id'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  itemId: bigint;

  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  mediaId: bigint;
}
