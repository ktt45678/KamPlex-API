import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { CursorPaginateDto } from '../../../common/dto';
import { transformBigInt } from '../../../utils';

export class CursorPageRatingsDto extends OmitType(CursorPaginateDto, ['search'] as const) {
  @ApiProperty({
    type: String,
    description: 'Author id',
    required: false
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  user: bigint;
}
