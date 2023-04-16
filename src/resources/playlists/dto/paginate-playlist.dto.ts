import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { OffsetPaginateDto } from '../../../common/dto';

export class PaginatePlaylistDto extends OmitType(OffsetPaginateDto, ['search'] as const) {
  @ApiProperty({
    type: String,
    description: 'Author id',
    required: false
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  author: bigint;
}
