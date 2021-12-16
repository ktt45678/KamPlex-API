import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';
import { ImgurScale } from '../../../enums/imgur-scale.enum';
import { appendToFilename } from '../../../utils/string-helper.util';
import { IMGUR_DIRECT_URL } from '../../../config';

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
      return `${IMGUR_DIRECT_URL}/${this.still.name}`;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailStillUrl(): string {
    if (this.still) {
      const thumbnailName = appendToFilename(this.still.name, ImgurScale.THUMBNAIL);
      return `${IMGUR_DIRECT_URL}/${thumbnailName}`;
    }
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallStillUrl(): string {
    if (this.still) {
      const thumbnailName = appendToFilename(this.still.name, ImgurScale.SMALL);
      return `${IMGUR_DIRECT_URL}/${thumbnailName}`;
    }
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get backdropColor(): number {
    if (this.still)
      return this.still.color;
  }
}