export enum StatusCode {
  IS_ALPHANUMERIC = 1,
  LENGTH = 2, // Both max length and min length
  USERNAME_EXIST = 3,
  IS_EMAIL = 4,
  EMAIL_EXIST = 5,
  MATCHES_REGEX = 6,
  IS_DATE = 7,
  MAX_DATE = 8,
  EMAIL_NOT_EXIST = 9,
  INCORRECT_PASSWORD = 10,
  NULL_AUTHORIZATION = 11,
  UNAUTHORIZED_NO_USER = 12,
  UNAUTHORIZED = 13,
  TOKEN_REVOKED = 14,
  CREDENTIALS_CHANGED = 15,
  ACCESS_DENIED = 16,
  IS_NOT_EMPTY = 17,
  MAX_LENGTH = 18,
  IS_INT = 19,
  INVALID_CODE = 20,
  MAX_NUMBER = 21,
  MIN_NUMBER = 22,
  ROLE_NOT_FOUND = 23,
  SETTING_EXIST = 24,
  SETTING_NOT_EXIST = 25,
  USER_NOT_FOUND = 26,
  AVATAR_NOT_FOUND = 27,
  PASSWORDS_NOT_MATCH = 28,
  IS_ARRAY = 29,
  ARRAY_UNIQUE = 30,
  REQUIRE_PASSWORD = 31,
  REQUIRE_MULTIPART = 32,
  REQUIRE_FILE = 33,
  FILE_DETECTION = 34,
  FILE_TOO_LARGE = 35,
  FILES_LIMIT_REACHED = 36,
  FILE_UNSUPPORTED = 37,
  THRID_PARTY_REQUEST_FAILED = 38,
  ROLE_PRIORITY = 39,
  ROLE_INVALID_POSITION = 40,
  PASSWORD_UPDATE_RESTRICTED = 41,
  RESTORE_ACCOUNT_RESTRICTED = 42,
  EMPTY_BODY = 43,
  PERMISSION_RESTRICTED = 44,
  MIN_LENGTH = 45,
  EXTERNAL_STORAGE_NOT_FOUND = 46,
  EXTERNAL_STORAGE_LIMIT = 47,
  IS_IN_ARRAY = 48,
  IS_URL = 49,
  USERS_NOT_FOUND = 50,
  EXTERNAL_STORAGE_NAME_EXIST = 51,
  POSTER_STORAGE_NOT_SET = 52,
  BACKDROP_STORAGE_NOT_SET = 53,
  MEDIA_STORAGE_NOT_SET = 54,
  IMAGE_MAX_DIMENSIONS = 55,
  IMAGE_MIN_DIMENSIONS = 56,
  IMAGE_RATIO = 57,
  IS_STRING = 58,
  IS_STRING_ARRAY = 59,
  GENRE_LIMIT_REACHED = 60,
  GENRE_NOT_FOUND = 61,
  GENRE_EXIST = 62,
  IS_ISO_3166_ALPHA2 = 63,
  PRODUCER_EXIST = 64,
  PRODUCER_NOT_FOUND = 65,
  SUBTITLE_STORAGE_NOT_SET = 66,
  IS_BOOLEAN = 67,
  GENRES_NOT_FOUND = 68,
  PRODUCERS_NOT_FOUND = 69,
  MEDIA_NOT_FOUND = 70,
  INVALID_YOUTUBE_URL = 71,
  THRID_PARTY_RATE_LIMIT = 72,
  EXTERNAL_STORAGE_FILES_EXIST = 73,
  IS_ISO6391 = 74,
  INVALID_SUBTITLE = 75,
  IS_ENDS_WITH = 76,
  DRIVE_SESSION_NOT_FOUND = 77,
  DRIVE_FILE_NOT_FOUND = 78,
  DRIVE_FILE_INVALID = 79,
  MEDIA_STREAM_NOT_FOUND = 80,
  MEDIA_SOURCE_EXIST = 81,
  SUBTITLE_EXIST = 82,
  MEDIA_VIDEO_EXIST = 83,
  RATING_NOT_FOUND = 84,
  PLAYLIST_ITEM_NOT_FOUND = 85,
  BAN_USER_RESTRICTED = 86,
  USER_BANNED = 87,
  EPISODE_NUMBER_EXIST = 88,
  EPISODE_NOT_FOUND = 89,
  STILL_STORAGE_NOT_SET = 90,
  IS_SHORT_DATE = 91,
  MAX_SHORT_DATE = 92,
  MOVIE_NOT_READY = 93,
  TV_NOT_READY = 94,
  IS_NUMBER_ARRAY = 95
}