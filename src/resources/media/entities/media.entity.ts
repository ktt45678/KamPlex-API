import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Genre } from '../../genres/entities/genre.entity';
import { MediaFile } from './media-file.entity';
import { ShortDate } from '../../../common/entities';
import { createCloudflareR2ProxyUrl } from '../../../utils';
import { CloudflareR2Container } from '../../../enums';

export class Media {
  @ApiProperty()
  _id: bigint;

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
  @Type(() => MediaFile)
  poster: MediaFile;

  @Exclude({ toPlainOnly: true })
  @Type(() => MediaFile)
  backdrop: MediaFile;

  @ApiProperty({
    type: Genre
  })
  @Type(() => Genre)
  genres: Genre[];

  @ApiProperty()
  originalLang: string;

  @ApiProperty()
  adult: boolean;

  @ApiProperty({
    type: ShortDate
  })
  @Type(() => ShortDate)
  releaseDate: ShortDate;

  @ApiProperty()
  views: number;

  @ApiProperty()
  ratingCount: number;

  @ApiProperty()
  ratingAverage: number;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  pStatus: number;

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
      return createCloudflareR2ProxyUrl(CloudflareR2Container.POSTERS, `${this.poster._id}/${this.poster.name}`, 750, this.poster.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailPosterUrl(): string {
    if (this.poster)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.POSTERS, `${this.poster._id}/${this.poster.name}`, 450, this.poster.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallPosterUrl(): string {
    if (this.poster)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.POSTERS, `${this.poster._id}/${this.poster.name}`, 250, this.poster.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullPosterUrl(): string {
    if (this.poster)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.POSTERS, `${this.poster._id}/${this.poster.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get posterColor(): number {
    if (this.poster)
      return this.poster.color;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get posterPlaceholder(): string {
    if (this.poster)
      return this.poster.placeholder;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropUrl(): string {
    if (this.backdrop)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 1200, this.backdrop.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailBackdropUrl(): string {
    if (this.backdrop)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 800, this.backdrop.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallBackdropUrl(): string {
    if (this.backdrop)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`, 500, this.backdrop.mimeType);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullBackdropUrl(): string {
    if (this.backdrop)
      return createCloudflareR2ProxyUrl(CloudflareR2Container.BACKDROPS, `${this.backdrop._id}/${this.backdrop.name}`);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropColor(): number {
    if (this.backdrop)
      return this.backdrop.color;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropPlaceholder(): string {
    if (this.backdrop)
      return this.backdrop.placeholder;
  }
}
