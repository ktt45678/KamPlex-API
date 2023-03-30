import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { BaseUser } from './base-user.entity';
import { UserFile } from './user-file.entity';
import { Role } from '../../roles';
import { createAzureStorageUrl, createAzureStorageProxyUrl } from '../../../utils';
import { AzureStorageContainer } from '../../../enums';

export class User extends BaseUser {
  @ApiProperty()
  roles: Role[];

  @Exclude({ toPlainOnly: true })
  password: string;

  @Exclude({ toPlainOnly: true })
  activationCode: string;

  @Exclude({ toPlainOnly: true })
  recoveryCode: string;

  @Exclude({ toPlainOnly: true })
  avatar: UserFile;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get avatarUrl(): string {
    if (this.avatar)
      return createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${this.avatar._id}/${this.avatar.name}`, 450, this.avatar.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailAvatarUrl(): string {
    if (this.avatar)
      return createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${this.avatar._id}/${this.avatar.name}`, 250, this.avatar.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallAvatarUrl(): string {
    if (this.avatar)
      return createAzureStorageProxyUrl(AzureStorageContainer.AVATARS, `${this.avatar._id}/${this.avatar.name}`, 120, this.avatar.mimeType)
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
