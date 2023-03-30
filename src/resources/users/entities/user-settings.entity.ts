export class UserSettings {
  mediaPlayer: MediaPlayerOptions;
  subtitle: SubtitleOptions;
  history: HistoryOptions;
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
  autoNextEpisode: boolean;
}

export class SubtitleOptions {
  fontSize: number;
  fontFamily: string;
  textColor: number;
  textOpacity: number;
  textEdge: number;
  backgroundColor: number;
  backgroundOpacity: number;
  windowColor: number;
  windowOpacity: number;
}

export class HistoryOptions {
  markWatchedAtPercentage: number;
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
