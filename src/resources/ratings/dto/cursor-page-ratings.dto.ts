import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { CursorPaginateDto } from '../../../common/dto';

export class CursorPageRatingsDto extends OmitType(CursorPaginateDto, ['search'] as const) {
  @ApiProperty({
    type: String,
    description: 'Author id',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  user: string;
}
