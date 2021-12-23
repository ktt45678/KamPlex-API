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

  @Exclude({ toPlainOnly: true })
  password: string;

  @ApiProperty()
  roles: Role[];

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  banned: boolean;

  @ApiProperty()
  owner?: boolean;

  @ApiProperty()
  createdAt: Date;

  @Exclude({ toPlainOnly: true })
  updatedAt: Date;

  @ApiProperty()
  lastActiveAt: Date;

  @Exclude({ toPlainOnly: true })
  activationCode: string;

  @Exclude({ toPlainOnly: true })
  recoveryCode: string;

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
