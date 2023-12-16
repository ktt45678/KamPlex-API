import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import { ShortDate } from '../../../common/entities';
import { UserFile } from './user-file.entity';
import { User } from './user.entity';
import { UserSettings } from './user-settings.entity';
import { createAzureStorageProxyUrl, createAzureStorageUrl } from '../../../utils';
import { AzureStorageContainer } from '../../../enums';

export class UserDetails extends User {
  @ApiProperty()
  email: string;

  @ApiProperty({
    type: ShortDate
  })
  @Type(() => ShortDate)
  birthdate: ShortDate;

  @ApiProperty()
  verified: boolean;

  @Exclude({ toPlainOnly: true })
  banner: UserFile;

  @ApiProperty({
    type: UserSettings
  })
  @Type(() => UserSettings)
  settings: UserSettings;

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get bannerUrl(): string {
    if (this.banner)
      return createAzureStorageProxyUrl(AzureStorageContainer.BANNERS, `${this.banner._id}/${this.banner.name}`, 1200, this.banner.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get thumbnailBannerUrl(): string {
    if (this.banner)
      return createAzureStorageProxyUrl(AzureStorageContainer.BANNERS, `${this.banner._id}/${this.banner.name}`, 800, this.banner.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get smallBannerUrl(): string {
    if (this.banner)
      return createAzureStorageProxyUrl(AzureStorageContainer.BANNERS, `${this.banner._id}/${this.banner.name}`, 500, this.banner.mimeType)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get fullBannerUrl(): string {
    if (this.banner)
      return createAzureStorageUrl(AzureStorageContainer.BANNERS, `${this.banner._id}/${this.banner.name}`)
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get bannerColor(): number {
    if (this.banner)
      return this.banner.color;
  }

  @ApiProperty()
  @Expose({ toPlainOnly: true })
  get bannerPlaceholder(): string {
    if (this.banner)
      return this.banner.placeholder;
  }
}
