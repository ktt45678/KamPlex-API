import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { transformBigInt } from '../../../utils';

export class FindAddToPlaylistDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  mediaId: bigint;

  @ApiProperty({
    type: String,
    description: 'Search playlist by name'
  })
  @Type(() => String)
  @IsOptional()
  search: string;
}
