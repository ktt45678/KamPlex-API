import { ApiProperty } from '@nestjs/swagger';

export class Avatar {
  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  thumbnailAvatarUrl: string;
}