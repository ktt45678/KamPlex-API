import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Max, Min } from 'class-validator';

import { StatusCode } from '../../enums';

export class ShortDate {
  @ApiProperty({
    type: Number,
    description: 'Day of birth'
  })
  @Type(() => Number)
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(31, { context: { code: StatusCode.MAX_NUMBER } })
  day: number;

  @ApiProperty({
    type: Number,
    description: 'Month of birth'
  })
  @Type(() => Number)
  @Min(1, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(12, { context: { code: StatusCode.MAX_NUMBER } })
  month: number;

  @ApiProperty({
    type: Number,
    description: 'Year of birth'
  })
  @Type(() => Number)
  @Min(1000, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(10000, { context: { code: StatusCode.MAX_NUMBER } })
  year: number;
}
