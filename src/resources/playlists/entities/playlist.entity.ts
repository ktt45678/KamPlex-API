import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Media, MediaFile } from '../../media';
import { AzureStorageContainer } from '../../../enums';
import { createAzureStorageProxyUrl } from '../../../utils';

export class Playlist {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  @Type(() => Media)
  thumbnailMedia: Media;

  @Exclude({ toPlainOnly: true })
  @Type(() => MediaFile)
  thumbnail: MediaFile;

  @ApiProperty()
  itemCount: number;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude()
  __v: number;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailUrl(): string {
    if (this.thumbnail)
      return createAzureStorageProxyUrl(AzureStorageContainer.PLAYLIST_THUMBNAILS, `${this.thumbnail._id}/${this.thumbnail.name}`, 720, this.thumbnail.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailThumbnailUrl(): string {
    if (this.thumbnail)
      return createAzureStorageProxyUrl(AzureStorageContainer.PLAYLIST_THUMBNAILS, `${this.thumbnail._id}/${this.thumbnail.name}`, 540, this.thumbnail.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallThumbnailUrl(): string {
    if (this.thumbnail)
      return createAzureStorageProxyUrl(AzureStorageContainer.PLAYLIST_THUMBNAILS, `${this.thumbnail._id}/${this.thumbnail.name}`, 240, this.thumbnail.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullThumbnailUrl(): string {
    if (this.thumbnail)
      return createAzureStorageProxyUrl(AzureStorageContainer.PLAYLIST_THUMBNAILS, `${this.thumbnail._id}/${this.thumbnail.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailColor(): number {
    return this.thumbnail?.color;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailPlaceholder(): string {
    return this.thumbnail?.placeholder;
  }
}
