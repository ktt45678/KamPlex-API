import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class AddMediaChapterDto {
  @ApiProperty({
    type: String,
    description: 'Chapter type id',
    example: '313350089462514688'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  type: bigint;

  @ApiProperty({
    type: Number,
    description: 'Start of the chapter in seconds',
    example: 5
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(600_000, { context: { code: StatusCode.MIN_NUMBER } })
  start: number;

  @ApiProperty({
    type: Number,
    description: 'Duration of the chapter in seconds',
    example: 30
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(600_000, { context: { code: StatusCode.MIN_NUMBER } })
  length: number;
}
