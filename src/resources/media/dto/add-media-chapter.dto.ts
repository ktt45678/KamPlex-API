import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, MaxLength, Min } from 'class-validator';
import { PropertyGt } from '../../../decorators/property-gt.decorator';

import { StatusCode } from '../../../enums';

export class AddMediaChapterDto {
  @ApiProperty({
    type: String,
    description: 'Chapter name',
    example: 'Intro'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(50, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

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
    description: 'End of the chapter in seconds',
    example: 100
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(600_000, { context: { code: StatusCode.MIN_NUMBER } })
  @PropertyGt('start', { context: { code: StatusCode.IS_GREATER_THAN_PROPERTY } })
  end: number;
}
