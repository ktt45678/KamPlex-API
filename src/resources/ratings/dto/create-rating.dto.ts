import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class CreateRatingDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: bigint;

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
