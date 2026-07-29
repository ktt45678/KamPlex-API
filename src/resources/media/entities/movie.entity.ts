import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';
import { MediaFile } from './media-file.entity';
import { TranscodeJob } from './transcode-job.entity';

export class Movie {
  @Exclude({ toPlainOnly: true })
  source: MediaStorage;

  @Exclude({ toPlainOnly: true })
  streams: MediaStorage[];

  @ApiProperty()
  @Type(() => MediaFile)
  subtitles: MediaFile[];

  @Exclude({ toPlainOnly: true })
  tJobs: TranscodeJob[];

  @ApiProperty()
  status: number;
}
