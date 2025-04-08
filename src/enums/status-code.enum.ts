export enum StatusCode {
  // Validation
  IS_ALPHANUMERIC = 1,
  LENGTH = 2, // Both max length and min length
  IS_EMAIL = 3,
  MATCHES_REGEX = 4,
  IS_DATE = 5,
  MAX_DATE = 6,
  IS_NOT_EMPTY = 7,
  MAX_LENGTH = 8,
  IS_INT = 9,
  MAX_NUMBER = 10,
  MIN_NUMBER = 11,
  IS_ARRAY = 12,
  ARRAY_UNIQUE = 13,
  REQUIRE_PASSWORD = 14,
  REQUIRE_MULTIPART = 15,
  REQUIRE_FILE = 16,
  FILE_DETECTION = 17,
  FILE_TOO_LARGE = 18,
  FILES_LIMIT_REACHED = 19,
  FILE_UNSUPPORTED = 20,
  EMPTY_BODY = 21,
  MIN_LENGTH = 22,
  IS_IN_ARRAY = 23,
  IS_URL = 24,
  IMAGE_MAX_DIMENSIONS = 25,
  IMAGE_MIN_DIMENSIONS = 26,
  IMAGE_RATIO = 27,
  IS_STRING = 28,
  IS_STRING_ARRAY = 29,
  IS_ISO_3166_ALPHA2 = 30,
  IS_BOOLEAN = 31,
  INVALID_YOUTUBE_URL = 32,
  IS_ISO6391 = 33,
  INVALID_SUBTITLE = 34,
  IS_ENDS_WITH = 35,
  IS_SHORT_DATE = 36,
  MAX_SHORT_DATE = 37,
  IS_NUMBER_ARRAY = 38,
  IS_GREATER_THAN_PROPERTY = 39,
  INVALID_CAPTCHA = 40,
  ARRAY_NOT_EMPTY = 41,
  IS_ENUM = 42,
  IS_NOT_BOTH_EQUAL = 43,
  // Auth
  USERNAME_EXIST = 100,
  EMAIL_EXIST = 101,
  EMAIL_NOT_EXIST = 102,
  INCORRECT_PASSWORD = 103,
  NULL_AUTHORIZATION = 104,
  UNAUTHORIZED_NO_USER = 105,
  UNAUTHORIZED = 106,
  TOKEN_REVOKED = 107,
  CREDENTIALS_CHANGED = 108,
  ACCESS_DENIED = 109,
  INVALID_CODE = 110,
  ROLE_NOT_FOUND = 111,
  // Settings
  SETTING_EXIST = 200,
  SETTING_NOT_EXIST = 201,
  // Users
  USER_NOT_FOUND = 300,
  USERS_NOT_FOUND = 301,
  AVATAR_NOT_FOUND = 302,
  PASSWORDS_NOT_MATCH = 303,
  BAN_USER_RESTRICTED = 304,
  USER_BANNED = 305,
  BANNER_NOT_FOUND = 306,
  // Roles
  ROLE_PRIORITY = 400,
  ROLE_INVALID_POSITION = 401,
  PASSWORD_UPDATE_RESTRICTED = 402,
  RESTORE_ACCOUNT_RESTRICTED = 403,
  PERMISSION_RESTRICTED = 404,
  // External Storages
  EXTERNAL_STORAGE_NOT_FOUND = 500,
  EXTERNAL_STORAGE_LIMIT = 501,
  EXTERNAL_STORAGE_NAME_EXIST = 502,
  POSTER_STORAGE_NOT_SET = 503,
  BACKDROP_STORAGE_NOT_SET = 504,
  MEDIA_STORAGE_NOT_SET = 505,
  SUBTITLE_STORAGE_NOT_SET = 506,
  EXTERNAL_STORAGE_FILES_EXIST = 507,
  STILL_STORAGE_NOT_SET = 508,
  // Genres
  GENRE_LIMIT_REACHED = 600,
  GENRE_NOT_FOUND = 601,
  GENRE_EXIST = 602,
  GENRES_NOT_FOUND = 603,
  // Productions
  PRODUCTION_EXIST = 700,
  PRODUCTION_NOT_FOUND = 701,
  PRODUCTIONS_NOT_FOUND = 702,
  // Media
  MEDIA_NOT_FOUND = 800,
  DRIVE_SESSION_NOT_FOUND = 801,
  DRIVE_FILE_NOT_FOUND = 802,
  DRIVE_FILE_INVALID = 803,
  MEDIA_SOURCE_NOT_FOUND = 804,
  MEDIA_STREAM_NOT_FOUND = 805,
  MEDIA_SOURCE_EXIST = 806,
  SUBTITLE_EXIST = 807,
  MEDIA_VIDEO_EXIST = 808,
  EPISODE_NUMBER_EXIST = 809,
  EPISODE_NOT_FOUND = 810,
  MOVIE_NOT_READY = 811,
  TV_NOT_READY = 812,
  CHAPTER_TIME_DUPLICATED = 813,
  CHAPTER_TYPE_USED = 814,
  CHAPTER_NOT_FOUND = 815,
  MEDIA_PRIVATE = 816,
  EPISODE_PRIVATE = 817,
  MOVIE_ENCODING_UNAVAILABLE = 818,
  EPISODE_ENCODING_UNAVAILABLE = 819,
  // Ratings
  RATING_NOT_FOUND = 900,
  RATING_USER_NOT_FOUND = 901,
  // Playlists
  PLAYLIST_NOT_FOUND = 1000,
  PLAYLIST_ITEM_NOT_FOUND = 1001,
  PLAYLIST_AUTHOR_NOT_FOUND = 1002,
  PLAYLIST_PRIVATE = 1003,
  PLAYLIST_UPDATE_FORBIDDEN = 1004,
  PLAYLIST_ITEM_UPDATE_INVALID = 1005,
  // Http
  THRID_PARTY_REQUEST_FAILED = 1100,
  THRID_PARTY_RATE_LIMIT = 1101,
  TOO_MANY_REQUESTS_TTL = 1102,
  TOO_MANY_REQUESTS_CAPTCHA = 1103,
  // Collection
  COLLECTION_NOT_FOUND = 1200,
  // History
  HISTORY_NOT_FOUND = 1300,
  // Media Tag
  TAG_NOT_FOUND = 1400,
  TAG_EXIST = 1401,
  TAGS_NOT_FOUND = 1402,
  // Chapter type
  CHAPTER_TYPE_NOT_FOUND = 1500,
  CHAPTER_TYPE_EXIST = 1501,
  CHAPTER_TYPE_IN_USE = 1502
}
