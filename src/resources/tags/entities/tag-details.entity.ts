import { Exclude } from 'class-transformer';

import { Tag } from './tag.entity';
import { Media } from '../../media/entities';

export class TagDetails extends Tag {
  @Exclude()
  media: Media;

  createdAt: Date;

  updatedAt: Date;
}
