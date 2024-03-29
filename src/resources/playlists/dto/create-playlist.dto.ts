import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsOptional, Length } from 'class-validator';

import { MediaVisibility, StatusCode } from '../../../enums';
import { MEDIA_VISIBILITY_TYPES } from '../../../config';
import { transformBigInt } from '../../../utils';

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
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  mediaId: bigint;
}
