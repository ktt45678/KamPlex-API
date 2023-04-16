import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { Media } from './media.entity';

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
  codec: number;

  @ApiProperty()
  mimeType: string;

  @Exclude({ toPlainOnly: true })
  media: any;

  @Exclude({ toPlainOnly: true })
  storage: ExternalStorage;
}
