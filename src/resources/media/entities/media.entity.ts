import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { Genre } from '../../genres/entities/genre.entity';
import { MediaStorage } from './media-storage.entity';
import { appendToFilename } from '../../../utils/string-helper.util';
import { ImgurScale } from '../../../enums/imgur-scale.enum';
import { IMGUR_DIRECT_URL } from '../../../config';

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
  likes: number;

  @ApiProperty()
  dislikes: number;

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
    if (this.poster && this.poster.name)
      return `${IMGUR_DIRECT_URL}/${this.poster.name}`;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailPosterUrl(): string {
    if (this.poster?.name) {
      const thumbnailName = appendToFilename(this.poster.name, ImgurScale.THUMBNAIL);
      return `${IMGUR_DIRECT_URL}/${thumbnailName}`;
    }
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallPosterUrl(): string {
    if (this.poster?.name) {
      const thumbnailName = appendToFilename(this.poster.name, ImgurScale.SMALL);
      return `${IMGUR_DIRECT_URL}/${thumbnailName}`;
    }
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
    if (this.backdrop?.name)
      return `${IMGUR_DIRECT_URL}/${this.backdrop.name}`;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailBackdropUrl(): string {
    if (this.backdrop?.name) {
      const thumbnailName = appendToFilename(this.backdrop.name, ImgurScale.THUMBNAIL);
      return `${IMGUR_DIRECT_URL}/${thumbnailName}`;
    }
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallBackdropUrl(): string {
    if (this.backdrop?.name) {
      const thumbnailName = appendToFilename(this.backdrop.name, ImgurScale.SMALL);
      return `${IMGUR_DIRECT_URL}/${thumbnailName}`;
    }
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropColor(): number {
    if (this.backdrop)
      return this.backdrop.color;
  }
}
