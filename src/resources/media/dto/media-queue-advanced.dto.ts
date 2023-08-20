import { Type } from 'class-transformer';
import { IsIn, IsOptional, ValidateNested } from 'class-validator';
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
    type: String,
    description: 'Tune option for H264',
    required: false
  })
  @IsOptional()
  @IsIn(['film', 'animation', 'grain', 'stillimage', 'fastdecode', 'zerolatency'], { context: { code: StatusCode.IS_IN_ARRAY } })
  h264Tune?: string;

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
