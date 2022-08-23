export interface ZoroWatch {
  headers: ZoroHeaders;
  sources: ZoroSource[];
  subtitles?: ZoroSubtitle[];
}

export interface ZoroSubtitle {
  url: string;
  lang: string;
}

export interface ZoroSource {
  url: string;
  quality?: string;
  isM3U8: boolean;
}

export interface ZoroHeaders {
  Referer: string;
}