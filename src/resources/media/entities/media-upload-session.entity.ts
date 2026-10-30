import { ApiProperty } from '@nestjs/swagger';

export class MediaUploadSession {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  url: string;

  @ApiProperty({ description: 'Size of each part in bytes, except the last one (s3 only)', required: false })
  partSize?: number;

  @ApiProperty({ description: 'Presigned PUT url of each part, in part order (s3 only)', type: [String], required: false })
  partUrls?: string[];
}
