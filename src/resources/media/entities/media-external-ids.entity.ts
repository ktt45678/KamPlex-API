import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, MaxLength, Min } from 'class-validator';

import { StatusCode } from '../../../enums';

export class MediaExternalIds {
  @ApiProperty({
    type: String,
    description: 'IMDb id'
  })
  @Type(() => String)
  @MaxLength(50, { context: { code: StatusCode.MAX_LENGTH } })
  imdb: string;

  @ApiProperty({
    type: Number,
    description: 'TMDb id'
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  tmdb: number;

  @ApiProperty({
    type: Number,
    description: 'AniList id (anime only)'
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  aniList: number;

  @ApiProperty({
    type: Number,
    description: 'My Anime List id (anime only)'
  })
  @Type(() => Number)
  @IsInt({ context: { code: StatusCode.IS_INT } })
  @Min(0, { context: { code: StatusCode.MIN_NUMBER } })
  mal: number;
}