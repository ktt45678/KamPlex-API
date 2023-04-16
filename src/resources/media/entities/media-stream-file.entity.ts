import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Media } from './media.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';

export class MediaStreamFile {
  @ApiProperty()
  _id: bigint;

  @Exclude({ toPlainOnly: true })
  type: number;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  path: string;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  codec: number;

  @ApiProperty()
  mimeType: string;

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
    return this.storage.publicUrl.replace(':path', `${this.path}/${this._id}/${this.name}`);
  }
}
