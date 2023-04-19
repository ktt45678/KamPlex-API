export class UserSettings {
  player: MediaPlayerOptions;
  subtitle: SubtitleOptions;
  history: HistoryOptions;
  playlist: PlaylistOptions;
  rating: RatingOptions;
  historyList: HistoryListOptions;
  playlistList: PlaylistListOptions;
  ratingList: RatingListOptions;
}

export class MediaPlayerOptions {
  muted: boolean;
  volume: number;
  quality: number;
  speed: number;
  subtitle: boolean;
  subtitleLang: string;
  autoNextEp: boolean;
}

export class SubtitleOptions {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textColor: number;
  textAlpha: number;
  textEdge: number;
  bgColor: number;
  bgAlpha: number;
  winColor: number;
  winAlpha: number;
}

export class HistoryOptions {
  limit: number;
  paused: boolean;
}

export class PlaylistOptions {
  visibility: number;
  recentId: string;
}

export class RatingOptions {

}

export class HistoryListOptions {
  view: number;
}

export class PlaylistListOptions {
  view: number;
}

export class RatingListOptions {
  view: number;
}
