import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class AddMediaVideoDto {
  @ApiProperty({
    type: String,
    description: 'YouTube Url of the video',
    example: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(1000, { context: { code: StatusCode.MAX_LENGTH } })
  @IsUrl({ require_protocol: true }, { context: { code: StatusCode.IS_URL } })
  url: string;

  @ApiProperty({
    type: String,
    description: 'Name of the video (Official trailer, teaser,...)',
    example: 'Official trailer'
  })
  @Type(() => String)
  @IsOptional()
  @MaxLength(100, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: Boolean,
    description: 'True if this video is official'
  })
  @Transform(({ value }) => {
    return [true, 'true'].indexOf(value) > -1;
  }, { toClassOnly: true })
  official: boolean;
}
