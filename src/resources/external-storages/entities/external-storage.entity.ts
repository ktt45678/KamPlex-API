import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class ExternalStorage {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  kind: string;

  @Exclude()
  accessToken: string;

  @Exclude()
  refreshToken: string;

  @Exclude()
  expiresAt: Date;

  @Exclude()
  folderId: string;

  @ApiProperty()
  folderName: string;

  @ApiProperty()
  publicUrl: string;

  @Exclude()
  __v: number;
}