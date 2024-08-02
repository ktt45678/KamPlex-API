import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Media } from './media.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { createCloudflareR2Url } from '../../../utils';
import { CloudflareR2Container } from '../../../enums';

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
    return createCloudflareR2Url(CloudflareR2Container.SUBTITLES, `${this._id}/${this.name}`);
  }
}
