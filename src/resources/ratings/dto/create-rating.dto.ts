import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CreateRatingDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: string;

  @ApiProperty({
    type: Number,
    description: 'Score'
  })
  @Type(() => Number)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @Max(10, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @IsInt({ context: { code: StatusCode.IS_INT } })
  score: number;
}
