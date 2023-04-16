import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { CursorPaginated } from '../../../common/entities';
import { Media } from '../../media';
import { PlaylistItem } from './playlist-item.entity';

export class CursorPagePlaylistItems extends CursorPaginated<PlaylistListItem> {
  @ApiProperty()
  totalResults: number = 0;

  @ApiProperty()
  @Type(() => Media)
  mediaList: Media[] = [];

  constructor() {
    super({ type: PlaylistListItem });
  }
}

class PlaylistListItem extends OmitType(PlaylistItem, ['media'] as const) {
  @ApiProperty()
  media: bigint;
}
