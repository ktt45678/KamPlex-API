import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import { MediaVisibility, StatusCode } from '../../../enums';
import { MEDIA_VISIBILITY_TYPES } from '../../../config';

export class CreatePlaylistDto {
  @ApiProperty({
    type: String,
    description: 'Playlist name'
  })
  @Type(() => String)
  @Length(1, 100, { context: { code: StatusCode.LENGTH } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Playlist description'
  })
  @Type(() => String)
  @IsOptional()
  @Length(1, 2000, { context: { code: StatusCode.LENGTH } })
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

  @ApiProperty({
    type: String,
    description: 'Add a media to this playlist'
  })
  @Type(() => String)
  @IsOptional()
  mediaId: string;
}
