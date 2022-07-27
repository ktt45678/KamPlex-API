import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Min, Max, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class EncodingSetting {
  @ApiProperty({
    type: Number,
    description: 'Playback quality'
  })
  @Type(() => Number)
  @IsNotEmpty()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(10000, { context: { code: StatusCode.MAX_NUMBER } })
  quality: number;

  @ApiProperty({
    type: Number,
    description: 'Encoding crf for h264 codec'
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(51, { context: { code: StatusCode.MAX_NUMBER } })
  crf: number;

  @ApiProperty({
    type: Number,
    description: 'Encoding cq for vp9 and av1 codecs'
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(63, { context: { code: StatusCode.MAX_NUMBER } })
  cq: number;

  @ApiProperty({
    type: Number,
    description: 'Encoding cq for vp9 and av1 codecs'
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(50000, { context: { code: StatusCode.MAX_NUMBER } })
  maxrate: number;

  @ApiProperty({
    type: Number,
    description: 'Encoding cq for vp9 and av1 codecs'
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  @Max(100000, { context: { code: StatusCode.MAX_NUMBER } })
  bufsize: number;

  @ApiProperty({
    type: Boolean,
    description: 'Use lower maxrate and bufsize when available'
  })
  @Transform(({ value }) => {
    return [true, 'true'].indexOf(value) > -1;
  })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  useLowerRate: boolean;
}