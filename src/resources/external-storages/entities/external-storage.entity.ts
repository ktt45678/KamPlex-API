import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { MediaStorage } from '../../media/entities/media-storage.entity';

export class ExternalStorage {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  kind: string;

  @Exclude({ toPlainOnly: true })
  accessToken: string;

  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  @Exclude({ toPlainOnly: true })
  expiresAt: Date;

  @Exclude({ toPlainOnly: true })
  folderId: string;

  @ApiProperty()
  folderName: string;

  @ApiProperty()
  publicUrl: string;

  @ApiProperty()
  inStorage: string;

  @Exclude({ toPlainOnly: true })
  files: MediaStorage[];

  @Expose({ toPlainOnly: true })
  totalFiles?(): number {
    return this.files?.length || 0;
  }
}