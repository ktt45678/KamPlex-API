import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { UserAvatar } from '../../../schemas/user-avatar.schema';
import { Role } from '../../roles/entities/role.entity';
import { createAzureStorageUrl, createAzureStorageProxyUrl } from '../../../utils';
import { AzureStorageContainer } from '../../../enums';

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
    if (this.avatar)
      return createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${this.avatar._id}/${this.avatar.name}`, 500, this.avatar.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailAvatarUrl(): string {
    if (this.avatar)
      return createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${this.avatar._id}/${this.avatar.name}`, 250, this.avatar.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullAvatarUrl(): string {
    if (this.avatar)
      return createAzureStorageUrl(AzureStorageContainer.AVATARS, `${this.avatar._id}/${this.avatar.name}`)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get avatarColor(): number {
    if (this.avatar)
      return this.avatar.color;
  }
}
