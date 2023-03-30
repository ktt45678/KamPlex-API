import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { CursorPaginateDto } from '../../../common/dto';
import { StatusCode } from '../../../enums';

export class CursorPageMediaDto extends OmitType(CursorPaginateDto, ['search'] as const) {
  @ApiProperty({
    type: String,
    description: 'Type (studio or producer)',
    maxLength: 32,
    example: 'Action'
  })
  @Type(() => String)
  @IsOptional()
  @IsIn(['studio', 'producer'], { context: { code: StatusCode.IS_IN_ARRAY } })
  type?: 'studio' | 'producer';
}
