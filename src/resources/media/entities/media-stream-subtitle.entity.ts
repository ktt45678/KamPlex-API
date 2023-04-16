import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Media } from './media.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { createAzureStorageUrl } from '../../../utils';
import { AzureStorageContainer } from '../../../enums';

export class MediaStreamSubtitle {
  @ApiProperty()
  _id: bigint;

  @Exclude({ toPlainOnly: true })
  type: number;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  path: string;

  @ApiProperty()
  lang: string;

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
    return createAzureStorageUrl(AzureStorageContainer.SUBTITLES, `${this._id}/${this.name}`);
  }
}
