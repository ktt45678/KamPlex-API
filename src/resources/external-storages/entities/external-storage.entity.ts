import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { MediaStorage } from '../../media/entities/media-storage.entity';

export class ExternalStorage {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  name: string;

  @ApiProperty()
  kind: number;

  @ApiProperty()
  @Exclude({ toPlainOnly: true })
  clientId: string;

  @ApiProperty()
  @Exclude({ toPlainOnly: true })
  clientSecret: string;

  @Exclude({ toPlainOnly: true })
  accessToken: string;

  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  @Exclude({ toPlainOnly: true })
  expiry: Date;

  @Exclude({ toPlainOnly: true })
  folderId: string;

  @ApiProperty()
  folderName: string;

  @ApiProperty()
  publicUrl: string;

  @ApiProperty()
  secondPublicUrl: string;

  @ApiProperty()
  inStorage: number;

  @ApiProperty()
  used: number;

  @Exclude({ toPlainOnly: true })
  files: MediaStorage[];

  @Expose({ toPlainOnly: true })
  totalFiles?(): number {
    return this.files?.length || 0;
  }

  @Exclude({ toPlainOnly: true })
  _decrypted?: boolean;
}
