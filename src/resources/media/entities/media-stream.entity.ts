import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaStreamFile } from './media-stream-file.entity';
import { MediaStreamSubtitle } from './media-stream-subtitle.entity';
import { TVEpisodeDetails } from './tv-episode-details.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { PREVIEW_THUMBNAIL_NAME } from '../../../config';

@Exclude({ toPlainOnly: true })
export class MediaStream {
  @ApiProperty({
    type: String
  })
  @Expose()
  _id: bigint;

  @ApiProperty({
    type: TVEpisodeDetails
  })
  @Expose()
  @Type(() => TVEpisodeDetails)
  episode: TVEpisodeDetails;

  @Type(() => ExternalStorage)
  @Expose({ toClassOnly: true })
  @Exclude({ toPlainOnly: true })
  storage: ExternalStorage;

  @Expose({ toClassOnly: true })
  @Exclude({ toPlainOnly: true })
  sourcePath: string;

  @ApiProperty({
    type: MediaStreamFile
  })
  @Expose()
  @Type(() => MediaStreamFile)
  streams: MediaStreamFile[];

  @ApiProperty({
    type: MediaStreamSubtitle
  })
  @Expose()
  @Type(() => MediaStreamSubtitle)
  subtitles: MediaStreamSubtitle[];

  @ApiProperty()
  @Expose()
  get baseUrl(): string {
    return this.storage.publicUrl.replace(':path', `${this.sourcePath}/:path`);
  }

  @ApiProperty()
  @Expose()
  get previewThumbnail(): string {
    return PREVIEW_THUMBNAIL_NAME;
  }
}
