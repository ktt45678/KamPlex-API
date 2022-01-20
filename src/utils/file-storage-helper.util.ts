import { UserAvatar } from '../schemas/user-avatar.schema';
import { CloudStorage, ImagekitTransform, UserFileType } from '../enums';
import { configService } from '../main';

export function createAvatarUrl(avatar: UserAvatar) {
  let url: string;
  if (avatar) {
    if (avatar.storage === CloudStorage.IMAGEKIT) {
      url = `${configService.get<string>('IMAGEKIT_URL')}/${ImagekitTransform.MEDIUM}/${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
    }
  }
  return url;
}

export function createAvatarThumbnailUrl(avatar: UserAvatar) {
  let url: string;
  if (avatar) {
    if (avatar.storage === CloudStorage.IMAGEKIT) {
      url = `${configService.get<string>('IMAGEKIT_URL')}/${ImagekitTransform.THUMBNAIL}/${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
    }
  }
  return url;
}

export function createAzureStorageUrl(container: string, filename: string) {
  return `${configService.get<string>('AZURE_STORAGE_URL')}/${container}/${filename}`;
}

export function createAzureStorageProxyUrl(container: string, filename: string, scale?: number) {
  const url = encodeURIComponent(`${configService.get<string>('AZURE_STORAGE_URL')}/${container}/${filename}`);
  if (scale)
    return `${configService.get<string>('IMAGE_PROXY_URL')}/?url=${url}&w=${scale}&h=${scale}`;
  return `${configService.get<string>('IMAGE_PROXY_URL')}/?url=${url}`;
}

/*
export class FileStorageHelper<T> {
  file: T;

  constructor(file: T) {
    this.file = file;
  }

  toMediumUrl() {
    let url: string;
    if (this.file) {
      if (this.file instanceof UserAvatar) {
        if (this.file.storage === CloudStorage.IMAGEKIT) {
          url = `${configService.get<string>('IMAGEKIT_URL')}/${ImagekitTransform.MEDIUM}/${UserFileType.AVATAR}/${this.file._id}/${this.file.name}`;
        }
      }
    }
    return url;
  }

  toThumbnailUrl() {
    let url: string;
    if (this.file) {
      if (this.file instanceof UserAvatar) {
        if (this.file.storage === CloudStorage.IMAGEKIT) {
          url = `${configService.get<string>('IMAGEKIT_URL')}/${ImagekitTransform.THUMBNAIL}/${UserFileType.AVATAR}/${this.file._id}/${this.file.name}`;
        }
      }
    }
    return url;
  }
}
*/