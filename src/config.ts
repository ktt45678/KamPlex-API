import { CloudStorage, Language, MediaFileType, MediaStorageType, MediaType, MediaVisibility, VideoCodec, UserFileType, UserVisibility } from './enums';

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
export const ACCESS_TOKEN_SECRET = 'default-access-token-secret';
export const REFRESH_TOKEN_SECRET = 'default-refresh-token-secret';
export const ACCESS_TOKEN_EXPIRY = 300;
export const REFRESH_TOKEN_EXPIRY = 2592000;
export const COOKIE_SECRET = 'default-cookie-secret';
export const USER_FILE_STORAGE: number[] = [CloudStorage.CLOUDINARY, CloudStorage.IMAGEKIT];
export const USER_FILE_TYPES: number[] = [UserFileType.AVATAR, UserFileType.BACKGROUND];
export const EXTERNAL_STORAGE_KIND: number[] = [CloudStorage.ONEDRIVE];
export const EXTERNAL_STORAGE_LIMIT = 200;
export const CACHE_MEMORY_MAX = 1024;
export const CACHE_MEMORY_TTL = 300;
export const DEFAULT_UPLOAD_SIZE = 10485760; // 10 MiB
export const UPLOAD_AVATAR_MAX_SIZE = 4194304; // 4 MiB
export const UPLOAD_AVATAR_MIN_WIDTH = 128;
export const UPLOAD_AVATAR_MIN_HEIGHT = 128;
export const UPLOAD_AVATAR_RATIO = [1, 1];
export const UPLOAD_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
export const UPLOAD_BANNER_MAX_SIZE = 8388608; // 8 MiB
export const UPLOAD_BANNER_MIN_WIDTH = 680;
export const UPLOAD_BANNER_MIN_HEIGHT = 240;
export const UPLOAD_BANNER_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
export const SNOWFLAKE_EPOCH = 1609459200000;
export const SNOWFLAKE_MACHINE_ID = 1;
//export const EPISODE_LIST_INIT_SIZE = 10;
export const UPLOAD_POSTER_MAX_SIZE = 3145728; // 3 MiB
export const UPLOAD_POSTER_MIN_WIDTH = 500;
export const UPLOAD_POSTER_MIN_HEIGHT = 750;
export const UPLOAD_POSTER_RATIO = [2, 3];
export const UPLOAD_BACKDROP_MAX_SIZE = 5242880; // 5 MiB
export const UPLOAD_BACKDROP_MIN_WIDTH = 1280;
export const UPLOAD_BACKDROP_MIN_HEIGHT = 720;
export const UPLOAD_BACKDROP_RATIO = [16, 9];
export const UPLOAD_STILL_MAX_SIZE = 2097152; // 2 MiB
export const UPLOAD_STILL_MIN_WIDTH = 320;
export const UPLOAD_STILL_MIN_HEIGHT = 180;
export const UPLOAD_STILL_RATIO = [16, 9];
export const UPLOAD_MEDIA_IMAGE_TYPES = ['image/png', 'image/jpeg'];
export const UPLOAD_PLAYLIST_THUMBNAIL_MAX_SIZE = 5242880; // 5 MiB
export const UPLOAD_PLAYLIST_THUMBNAIL_MIN_WIDTH = 854;
export const UPLOAD_PLAYLIST_THUMBNAIL_MIN_HEIGHT = 480;
export const UPLOAD_PLAYLIST_THUMBNAIL_RATIO = [16, 9];
export const UPLOAD_PLAYLIST_THUMBNAIL_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const UPLOAD_SUBTITLE_MAX_SIZE = 512000;
export const UPLOAD_SUBTITLE_TYPES = ['text/plain'];
export const UPLOAD_MEDIA_SOURCE_EXT = ['.mp4', '.mkv', '.webm', '.m2ts'];
export const UPLOAD_MEDIA_SOURCE_TYPES = ['video/mp4', 'video/x-matroska', 'video/webm', 'video/MP2T'];
export const UPLOAD_MEDIA_SOURCE_MAX_SIZE = 53687091200; // 50 GiB
export const GENRE_LIMIT = 500;
export const I18N_LANGUAGES: string[] = [Language.EN, Language.VI];
export const I18N_DEFAULT_LANGUAGE: string = Language.EN;
export const MEDIA_TYPES: string[] = [MediaType.MOVIE, MediaType.TV];
export const MEDIA_STORAGE_TYPES: number[] = [MediaStorageType.SOURCE, MediaStorageType.STREAM_VIDEO];
export const MEDIA_FILE_TYPES: number[] = [MediaFileType.BACKDROP, MediaFileType.POSTER, MediaFileType.SUBTITLE, MediaFileType.STILL, MediaFileType.PLAYLIST_THUMBNAIL];
export const MEDIA_VISIBILITY_TYPES: number[] = [MediaVisibility.PUBLIC, MediaVisibility.UNLISTED, MediaVisibility.PRIVATE];
export const USER_VISIBILITY_TYPES: number[] = [UserVisibility.PUBLIC, UserVisibility.PRIVATE];
export const STREAM_CODECS: number[] = [VideoCodec.H264, VideoCodec.VP9, VideoCodec.AV1];
export const PREVIEW_THUMBNAIL_NAME = 'thumbnails/M.vtt';
