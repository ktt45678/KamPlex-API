import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { CreatePlaylistDto } from './create-playlist.dto';

export class UpdatePlaylistDto extends PartialType(CreatePlaylistDto) {
  /*
  @ApiProperty({
    type: String,
    description: 'Thumbnail media id'
  })
  @Type(() => String)
  @IsOptional()
  thumbnailMedia: string;
  */
}
