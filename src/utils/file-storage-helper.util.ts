import { UserFile } from '../schemas';
import { ImagekitTransform, UserFileType } from '../enums';
import { configService } from '../main';

export function createAvatarUrl(avatar: UserFile) {
  let url: string;
  if (avatar) {
    url = `${configService.get<string>('IMAGEKIT_URL')}/${ImagekitTransform.MEDIUM}/${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
  }
  return url;
}

export function createAvatarThumbnailUrl(avatar: UserFile) {
  let url: string;
  if (avatar) {
    url = `${configService.get<string>('IMAGEKIT_URL')}/${ImagekitTransform.THUMBNAIL}/${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
  }
  return url;
}

export function createAzureStorageUrl(container: string, filename: string) {
  return `${configService.get<string>('AZURE_STORAGE_URL')}/${container}/${filename}`;
}

export function createAzureStorageProxyUrl(container: string, filePath: string, scale?: number, mimeType?: string) {
  const fileName = filePath.split('/').pop();
  const params = new URLSearchParams();
  params.append('url', `${configService.get<string>('AZURE_STORAGE_URL')}/${container}/${filePath}`);
  params.append('maxage', '1M');
  params.append('filename', fileName);
  if (scale) {
    const wh = scale.toString();
    params.append('w', wh);
    params.append('h', wh);
    params.append('we', '');
  }
  switch (mimeType) {
    case 'image/png':
      break;
    case 'image/jpeg':
      //params.append('q', '90');
      break;
    case 'image/gif':
      params.append('n', '-1');
      break;
    default:
      break;
  }
  return `${configService.get<string>('IMAGE_PROXY_URL')}/?${params.toString()}`;
}

export function createCloudflareR2Url(container: string, filename: string) {
  return `${configService.get<string>('CLOUDFLARE_R2_URL')}/${container}/${filename}`;
}

export function createCloudflareR2ProxyUrl(container: string, filePath: string, scale?: number, mimeType?: string) {
  const fileName = filePath.split('/').pop();
  const params = new URLSearchParams();
  params.append('url', `${configService.get<string>('CLOUDFLARE_R2_URL')}/${container}/${filePath}`);
  params.append('maxage', '1M');
  params.append('filename', fileName);
  if (scale) {
    const wh = scale.toString();
    params.append('w', wh);
    params.append('h', wh);
    params.append('we', '');
  }
  switch (mimeType) {
    case 'image/png':
      break;
    case 'image/jpeg':
      break;
    case 'image/gif':
      params.append('n', '-1');
      break;
    default:
      break;
  }
  return `${configService.get<string>('IMAGE_PROXY_URL')}/?${params.toString()}`;
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
