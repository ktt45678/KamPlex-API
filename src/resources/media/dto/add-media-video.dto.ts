import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsUrl } from 'class-validator';

import { StatusCode } from '../../../enums/status-code.enum';

export class AddMediaVideoDto {
  @ApiProperty({
    type: String,
    description: 'YouTube Url of the video',
    example: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @IsUrl({ require_protocol: true }, { context: { code: StatusCode.IS_URL } })
  url: string;
}