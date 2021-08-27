import { CloudStorage } from './enums/cloud-storage.enum';
import { UserFileType } from './enums/user-file-type.enum';

export const PORT = 3000;
export const ADDRESS = '0.0.0.0';
export const DATABASE_URL = '';
export const DOCUMENT_TITLE = 'KamPlex API';
export const DOCUMENT_DESCRIPTION = 'REST API media streaming';
export const DOCUMENT_VERSION = '0.0.1';
export const DOCUMENT_AUTHOR = 'Kaigonia';
export const DOCUMENT_GITHUB = 'https://github.com/ktt45678';
export const DOCUMENT_EMAIL = 'ktt45678@gmail.com';
export const PASSWORD_HASH_ROUNDS = 10;
export const ACCESS_TOKEN_SECRET = 'secret';
export const REFRESH_TOKEN_SECRET = 'secret';
export const ACCESS_TOKEN_EXPIRY = 300;
export const REFRESH_TOKEN_EXPIRY = 2592000;
export const USER_FILE_STORAGE = [CloudStorage.CLOUDINARY, CloudStorage.IMAGEKIT];
export const USER_FILE_TYPES = [UserFileType.AVATAR, UserFileType.BACKGROUND];
export const EXTERNAL_STORAGE_KIND = [CloudStorage.IMGUR, CloudStorage.GOOGLE_DRIVE];
export const EXTERNAL_STORAGE_LIMIT = 50;
export const CACHE_MEMORY_MAX = 1024;
export const CACHE_MEMORY_TTL = 300;
export const DEFAULT_UPLOAD_SIZE = 10485760; // 10 MiB
export const UPLOAD_AVATAR_MAX_SIZE = 8388608; // 8 MiB
export const UPLOAD_AVATAR_MIN_WIDTH = 128;
export const UPLOAD_AVATAR_MIN_HEIGHT = 128;
export const UPLOAD_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif']; // 8 MiB
export const SNOWFLAKE_MACHINE_ID = 1;
export const UPLOAD_POSTER_MIN_WIDTH = 500;
export const UPLOAD_POSTER_MIN_HEIGHT = 750;
export const UPLOAD_POSTER_RATIO = 2 / 3;