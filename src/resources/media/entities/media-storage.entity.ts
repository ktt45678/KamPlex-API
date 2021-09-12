import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';

export class MediaStorage {
  @ApiProperty()
  _id: string;

  @Exclude({ toPlainOnly: true })
  type: string;

  @ApiProperty()
  name: string;

  @Exclude({ toPlainOnly: true })
  path: string;

  @ApiProperty()
  quality: number;

  @ApiProperty()
  codec: string;

  @ApiProperty()
  color: number;

  @ApiProperty()
  mimeType: string;

  @Exclude({ toPlainOnly: true })
  media: any;

  @Exclude({ toPlainOnly: true })
  storage: ExternalStorage;
}