import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { UserAvatar } from '../../../schemas/user-avatar.schema';
import { createAvatarUrl, createAvatarThumbnailUrl } from '../../../utils';

export class RoleUsers {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  banned: string;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @Exclude({ toPlainOnly: true })
  avatar: UserAvatar

  @ApiProperty()
  @Expose()
  get avatarUrl(): string {
    return createAvatarUrl(this.avatar);
  }

  @ApiProperty()
  @Expose()
  get avatarThumbnailUrl(): string {
    return createAvatarThumbnailUrl(this.avatar);
  }
}
