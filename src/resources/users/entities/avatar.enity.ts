import { ApiProperty } from '@nestjs/swagger';

export class Avatar {
  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  thumbnailAvatarUrl: string;

  @ApiProperty()
  smallAvatarUrl: string;

  @ApiProperty()
  fullAvatarUrl: string;

  @ApiProperty()
  avatarColor: number;

  @ApiProperty()
  avatarPlaceholder: string;
}
