import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CursorPageHistoryDto {
  @ApiProperty({
    type: String,
    description: 'Page token',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  pageToken: string;

  @ApiProperty({
    type: Number,
    description: 'Limit items per page',
    required: false,
    minimum: 1,
    maximum: 50,
    default: 30
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Max(50, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  limit: number = 30;
}
