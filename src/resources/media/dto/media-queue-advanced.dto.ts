import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { StatusCode } from '../../../enums';
import { EncodingSetting } from '../../settings';
import { IsNotBothEqual } from '../../../decorators/is-not-both-equal.decorator';

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
    type: Boolean,
    description: 'Encode only audio, keep current video tracks if available (re-encode only)',
    default: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  @IsNotBothEqual('videoOnly', true, { context: { code: StatusCode.IS_NOT_BOTH_EQUAL } })
  audioOnly?: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Encode only video, keep current audio tracks if available (re-encode only)',
    default: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  @IsNotBothEqual('audioOnly', true, { context: { code: StatusCode.IS_NOT_BOTH_EQUAL } })
  videoOnly?: boolean;

  @ApiProperty({
    type: Number,
    description: 'Codec for video',
    example: 1
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  videoCodecs?: number;

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
