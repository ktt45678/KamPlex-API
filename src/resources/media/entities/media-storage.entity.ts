import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { MediaStorageStream } from './media-storage-stream.entity';

export class MediaStorage {
  @ApiProperty()
  _id: bigint;

  @Exclude({ toPlainOnly: true })
  type: number;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  path: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  streams: MediaStorageStream[];

  @Exclude({ toPlainOnly: true })
  media: any;

  @Exclude({ toPlainOnly: true })
  storage: ExternalStorage;

  @Exclude({ toPlainOnly: true })
  linkedStorage?: ExternalStorage;
}
