import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { CursorPagePlaylistItemsDto } from './cursor-page-playlist-items.dto';
import { transformBigInt } from '../../../utils';

export class CursorPagePlaylistsDto extends CursorPagePlaylistItemsDto {
  @ApiProperty({
    type: String,
    description: 'Author id',
    required: false
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsOptional()
  author: bigint;
}
