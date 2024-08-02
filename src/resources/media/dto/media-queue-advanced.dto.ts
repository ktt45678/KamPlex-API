import { Transform, Type } from 'class-transformer';
import { IsIn, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { StatusCode } from '../../../enums';
import { EncodingSetting } from '../../settings';

export class MediaQueueAdvancedDto {
  @ApiProperty({
    type: [Number],
    description: 'Select audio tracks to encode',
    required: false
  })
  @Type(() => Number)
  @IsOptional()
  selectAudioTracks?: number[];

  @ApiProperty({
    type: [Number],
    description: 'Select extra audio tracks to encode',
    required: false
  })
  @Type(() => Number)
  @IsOptional()
  extraAudioTracks?: number[];

  @ApiProperty({
    type: [Number],
    description: 'List of required video quality to encode',
    required: false
  })
  @Type(() => Number)
  @IsOptional()
  forceVideoQuality?: number[];

  @ApiProperty({
    type: String,
    description: 'Tune option for H264',
    required: false
  })
  @IsOptional()
  @IsIn(['film', 'animation', 'grain', 'stillimage', 'fastdecode', 'zerolatency'], { context: { code: StatusCode.IS_IN_ARRAY } })
  h264Tune?: string;

  @ApiProperty({
    type: Number,
    description: 'Queue priority',
    required: false,
    minimum: 1,
    maximum: 2_000_000
  })
  @Type(() => Number)
  @IsOptional()
  @Transform(({ value }) => value || 10, { toClassOnly: true })
  @Min(1)
  @Max(2_000_000)
  queuePriority?: number;

  @ApiProperty({
    type: [EncodingSetting],
    description: 'Override encoding settings',
    required: false
  })
  @Type(() => EncodingSetting)
  @IsOptional()
  @ValidateNested({ each: true })
  overrideSettings?: EncodingSetting[];
}
