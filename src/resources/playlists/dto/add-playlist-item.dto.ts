import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class AddPlaylistItemDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  mediaId: string;
}
