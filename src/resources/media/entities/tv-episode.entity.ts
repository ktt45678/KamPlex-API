import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';
import { createAzureStorageProxyUrl } from '../../../utils';
import { AzureStorageContainer } from '../../../enums';

export class TVEpisode {
  @ApiProperty()
  episodeNumber: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @ApiProperty()
  runtime: number;

  @ApiProperty()
  airDate: string;

  @Exclude({ toPlainOnly: true })
  still: MediaStorage;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  status: number;

  @Exclude({ toPlainOnly: true })
  source: MediaStorage;

  @Exclude({ toPlainOnly: true })
  streams: MediaStorage[];

  @Exclude({ toPlainOnly: true })
  subtitles: MediaStorage[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get stillUrl(): string {
    if (this.still)
      return createAzureStorageProxyUrl(AzureStorageContainer.STILLS, `${this.still._id}/${this.still.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailStillUrl(): string {
    if (this.still)
      return createAzureStorageProxyUrl(AzureStorageContainer.STILLS, `${this.still._id}/${this.still.name}`, 200);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallStillUrl(): string {
    if (this.still)
      return createAzureStorageProxyUrl(AzureStorageContainer.STILLS, `${this.still._id}/${this.still.name}`, 100);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get stillColor(): number {
    if (this.still)
      return this.still.color;
  }
}