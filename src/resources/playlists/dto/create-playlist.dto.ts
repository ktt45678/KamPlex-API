import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';

import { MediaVisibility, StatusCode } from '../../../enums';
import { MEDIA_VISIBILITY_TYPES } from '../../../config';

export class CreatePlaylistDto {
  @ApiProperty({
    type: String,
    description: 'Playlist name'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Playlist description'
  })
  @Type(() => String)
  @IsOptional()
  description: string;

  @ApiProperty({
    type: Number,
    description: 'Visibility of the playlist',
    enum: MEDIA_VISIBILITY_TYPES,
    example: MediaVisibility.PUBLIC
  })
  @Type(() => Number)
  @IsIn(MEDIA_VISIBILITY_TYPES)
  visibility: number;
}
