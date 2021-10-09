import { ApiProperty } from '@nestjs/swagger';

export class PlaylistItem {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  author: string;

  @ApiProperty()
  media: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  __v: number;
}
