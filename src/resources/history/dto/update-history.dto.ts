import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Max, Min, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class UpdateHistoryDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: string;

  @ApiProperty({
    type: Number,
    description: 'Last time watched',
    required: false,
    minimum: 0,
    maximum: 10000000,
    default: 30
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Max(10000000, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  watchtime: number = 0;
}