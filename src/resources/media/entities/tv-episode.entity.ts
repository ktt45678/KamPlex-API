import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';
import { MediaFile } from './media-file.entity';
import { ShortDate } from '../../../common/entities';
import { createCloudflareR2ProxyUrl } from '../../../utils';
import { CloudflareR2Container } from '../../../enums';

export class TVEpisode {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  epNumber: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @ApiProperty()
  runtime: number;

  @ApiProperty({
    type: ShortDate
  })
  @Type(() => ShortDate)
  airDate: ShortDate;

  @Exclude({ toPlainOnly: true })
  still: MediaFile;

  @ApiProperty()
  views: number;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  status: number;

  @Exclude({ toPlainOnly: true })
  source: MediaStorage;

  @Exclude({ toPlainOnly: true })
  streams: MediaStorage[];

  @Exclude({ toPlainOnly: true })
  tJobs: number[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get stillUrl(): string {
    if (this.still)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.STILLS, `${this.still._id}/${this.still.name}`, 480);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailStillUrl(): string {
    if (this.still)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.STILLS, `${this.still._id}/${this.still.name}`, 240);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallStillUrl(): string {
    if (this.still)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.STILLS, `${this.still._id}/${this.still.name}`, 100);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullStillUrl(): string {
    if (this.still)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.STILLS, `${this.still._id}/${this.still.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get stillColor(): number {
    if (this.still)
      return this.still.color;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get stillPlaceholder(): string {
    if (this.still)
      return this.still.placeholder;
  }
}
