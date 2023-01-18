import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { CursorPagePlaylistItemsDto } from './cursor-page-playlist-items.dto';

export class CursorPagePlaylistsDto extends CursorPagePlaylistItemsDto {
  @ApiProperty({
    type: String,
    description: 'Author id',
    required: false
  })
  @Type(() => String)
  @IsOptional()
  author: string;
}
