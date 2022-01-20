import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Genre } from '../../genres/entities/genre.entity';
import { MediaStorage } from './media-storage.entity';
import { createAzureStorageProxyUrl } from '../../../utils';
import { AzureStorageContainer } from '../../../enums';

export class Media {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  originalTitle: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  overview: string;

  @ApiProperty()
  runtime: number;

  @Exclude({ toPlainOnly: true })
  @Type(() => MediaStorage)
  poster: MediaStorage;

  @Exclude({ toPlainOnly: true })
  @Type(() => MediaStorage)
  backdrop: MediaStorage;

  @ApiProperty({
    type: Genre
  })
  @Type(() => Genre)
  genres: Genre[];

  @ApiProperty()
  originalLanguage: string;

  @ApiProperty()
  adult: boolean;

  @ApiProperty()
  releaseDate: string;

  @ApiProperty()
  views: number;

  @ApiProperty()
  ratingCount: number;

  @ApiProperty()
  ratingAverage: number;

  @ApiProperty()
  visibility: number;

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
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailPosterUrl(): string {
    if (this.poster)
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`, 500);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallPosterUrl(): string {
    if (this.poster)
      return createAzureStorageProxyUrl(AzureStorageContainer.POSTERS, `${this.poster._id}/${this.poster.name}`, 200);
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
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailBackdropUrl(): string {
    if (this.backdrop)
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 720);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallBackdropUrl(): string {
    if (this.backdrop)
      return createAzureStorageProxyUrl(AzureStorageContainer.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 480);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropColor(): number {
    if (this.backdrop)
      return this.backdrop.color;
  }
}
