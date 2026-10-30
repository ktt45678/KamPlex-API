import { ChapterType, ExternalStorage, MediaChapter, MediaStorage, Movie, TVEpisode, TVShow } from '../../schemas';

export type SourceWithStorage = Omit<MediaStorage, 'storage'> & { storage: ExternalStorage };

export type PopulatedMovieSource = { movie: Omit<Movie, 'source'> & { source: MediaStorage } };

export type PopulatedMovieSourceWithStorage = { movie: Omit<Movie, 'source'> & { source: SourceWithStorage } };

export type PopulatedEpisodeSourceWithStorage = { source: SourceWithStorage };

export type PopulatedTVEpisodes = { tv: Omit<TVShow, 'episodes'> & { episodes: TVEpisode[] } };

export type ChapterTypeSummary = Pick<ChapterType, '_id' | 'name' | '_translations'>;

export type PopulatedChapter = Omit<MediaChapter, 'type'> & { type: ChapterTypeSummary };

export type PopulatedMovieChapters = { movie: Omit<Movie, 'chapters'> & { chapters: PopulatedChapter[] } };

export type PopulatedEpisodeChapters = { chapters: PopulatedChapter[] };

export type EpisodeNumber = Pick<TVEpisode, '_id' | 'epNumber'>;

export type PopulatedLastEpisodes = { tv: Omit<TVShow, 'lastEpisode' | 'pLastEpisode'> & { lastEpisode: EpisodeNumber; pLastEpisode: EpisodeNumber } };
