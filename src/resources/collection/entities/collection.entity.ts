import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaFile } from '../../media';
import { AzureStorageContainer } from '../../../enums';
import { createAzureStorageProxyUrl } from '../../../utils';

export class Collection {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  @Type(() => MediaFile)
  poster: MediaFile;

  @Exclude({ toPlainOnly: true })
  @Type(() => MediaFile)
  backdrop: MediaFile;

  @ApiProperty({
    required: false
  })
  _translated?: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude({ toPlainOnly: true })
  __v: number;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get posterUrl(): string {
    if (this.poster)
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`, 750, this.poster.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailPosterUrl(): string {
    if (this.poster)
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`, 450, this.poster.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallPosterUrl(): string {
    if (this.poster)
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`, 250, this.poster.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullPosterUrl(): string {
    if (this.poster)
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get posterColor(): number {
    if (this.poster)
      return this.poster.color;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropUrl(): string {
    if (this.backdrop)
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 1500, this.backdrop.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailBackdropUrl(): string {
    if (this.backdrop)
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 1000, this.backdrop.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallBackdropUrl(): string {
    if (this.backdrop)
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 700, this.backdrop.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullBackdropUrl(): string {
    if (this.backdrop)
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropColor(): number {
    if (this.backdrop)
      return this.backdrop.color;
  }
}
