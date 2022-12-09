import { PickType } from '@nestjs/swagger';

import { Playlist } from './playlist.entity';

export class PlaylistToAdd extends PickType(Playlist, ['_id', 'name', 'itemCount', 'visibility', 'createdAt'] as const) {
  hasMedia: boolean;
}
