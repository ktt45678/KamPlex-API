import { UserAvatar } from '../schemas/user-avatar.schema';
import { CloudStorage } from '../enums/cloud-storage.enum';
import { ImagekitTransform } from '../enums/imagekit-transform.enum';
import { UserFileType } from '../enums/user-file-type.enum';

export function createAvatarUrl(avatar: UserAvatar) {
  let url: string;
  if (avatar) {
    if (avatar.storage === CloudStorage.IMAGEKIT) {
      url = `${process.env.IMAGEKIT_URL}/${ImagekitTransform.MEDIUM}/${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
    }
  }
  return url;
}

export function createAvatarThumbnailUrl(avatar: UserAvatar) {
  let url: string;
  if (avatar) {
    if (avatar.storage === CloudStorage.IMAGEKIT) {
      url = `${process.env.IMAGEKIT_URL}/${ImagekitTransform.THUMBNAIL}/${UserFileType.AVATAR}/${avatar._id}/${avatar.name}`;
    }
  }
  return url;
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
          url = `${process.env.IMAGEKIT_URL}/${ImagekitTransform.MEDIUM}/${UserFileType.AVATAR}/${this.file._id}/${this.file.name}`;
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
          url = `${process.env.IMAGEKIT_URL}/${ImagekitTransform.THUMBNAIL}/${UserFileType.AVATAR}/${this.file._id}/${this.file.name}`;
        }
      }
    }
    return url;
  }
}
*/