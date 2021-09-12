import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { UserAvatar } from '../../../schemas/user-avatar.schema';
import { Role } from '../../roles/entities/role.entity';
import { createAvatarUrl, createAvatarThumbnailUrl } from '../../../utils/file-storage-helper.util';

export class User {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  roles: Role[];

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  banned: boolean;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @Exclude({ toPlainOnly: true })
  avatar: UserAvatar;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get avatarUrl(): string {
    return createAvatarUrl(this.avatar);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get avatarThumbnailUrl(): string {
    return createAvatarThumbnailUrl(this.avatar);
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get avatarColor(): number {
    if (this.avatar)
      return this.avatar.color;
  }
}
