import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsInt, Max, Min, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class UpdateWatchTimeDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: bigint;

  @ApiProperty({
    type: String,
    description: 'Episode id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  episode: bigint;

  @ApiProperty({
    type: Number,
    description: 'Last time watched',
    required: false,
    minimum: 0,
    maximum: 10_000_000,
    default: 30
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Max(10_000_000, { context: { code: StatusCode.MAX_NUMBER } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  time: number = 0;
}
