import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Media } from './media.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { DROPBOX_DIRECT_URL } from '../../../config';

export class MediaStreamSubtitle {
  @ApiProperty()
  _id: string;

  @Exclude({ toPlainOnly: true })
  type: number;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  path: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  size: number;

  @Exclude({ toPlainOnly: true })
  media: Media;

  @Type(() => ExternalStorage)
  @Exclude({ toPlainOnly: true })
  storage: ExternalStorage;

  @Exclude({ toPlainOnly: true })
  __v: number;

  @Expose({ toPlainOnly: true })
  get src(): string {
    if (this.path)
      return `${DROPBOX_DIRECT_URL}/${this.path}`;
  }
}