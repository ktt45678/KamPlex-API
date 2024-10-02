import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { Paginated } from '../../entities/paginated.entity';
import { Media } from '../../../resources/media-scanner/entities/media.entity';
import { MediaDetails } from '../../../resources/media-scanner/entities/media-details.entity';
import { MediaCollection } from '../../../resources/media-scanner/entities/media-collection.entity';
import { MediaExternalIds } from '../../../resources/media/entities/media-external-ids.entity';
import { TVEpisode } from '../../../resources/media-scanner/entities/tv-episode.entity';
import { Production } from '../../../resources/media-scanner/entities/production.entity';
import { MediaVideo } from '../../../resources/media-scanner/entities/media-video.entity';
import { MediaAltTitle } from '../../../resources/media-scanner/entities/media-alt-title.entity';
import { EpisodeTranslation, MediaTranslation } from '../../../resources/media-scanner/entities/media-translation.entity';
import { TVSeason } from '../../../resources/media-scanner/entities/tv-season.entity';
import { MediaImages } from '../../../resources/media-scanner/entities/media-images.entity';
import { MediaImageItem } from '../../../resources/media-scanner/entities/media-image-item.entity';
import { Search, Movie, TV, MovieDetails, TvShowDetails, ExternalIds, EpisodeDetails, Video, Title, Translation, TMDBImages, CollectionDetails, MediaKeyword } from './interfaces';
import { StatusCode } from '../../../enums';
import { apStyleTitleCase } from '../../../utils';
import { I18N_LANGUAGES } from '../../../config';

@Injectable()
export class TmdbScannerService {
  private baseUrl = 'https://api.themoviedb.org/3';
  private headers: any;

  constructor(private httpService: HttpService, private configService: ConfigService) {
    this.headers = { 'Authorization': `Bearer ${this.configService.get<string>('TMDB_ACCESS_TOKEN')}` };
  }

  async searchMovie(query: string, page: number, year: number, language: string, includeAdult: boolean) {
    try {
      const response = await firstValueFrom(this.httpService.get<Search<Movie>>(`${this.baseUrl}/search/movie`,
        {
          params: { query, page, primary_release_year: year, language, include_adult: includeAdult },
          headers: this.headers
        }));
      const data = response.data;
      const results = new Paginated<Media>();
      results.page = data.page;
      results.totalPages = data.total_pages;
      results.totalResults = data.total_results;
      results.results = [];
      for (let i = 0; i < data.results.length; i++) {
        const result = new Media();
        result.id = data.results[i].id;
        result.title = data.results[i].title;
        result.originalTitle = data.results[i].original_title;
        result.overview = data.results[i].overview;
        result.posterPath = data.results[i].poster_path;
        result.releaseDate = data.results[i].release_date;
        result.adult = data.results[i].adult;
        results.results.push(result);
      }
      return results;
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async searchTv(query: string, page: number, year: number, language: string, includeAdult: boolean) {
    try {
      const response = await firstValueFrom(this.httpService.get<Search<TV>>(`${this.baseUrl}/search/tv`, {
        params: { query, page, primary_release_year: year, language, include_adult: includeAdult },
        headers: this.headers
      }));
      const data = response.data;
      const results = new Paginated<Media>();
      results.page = data.page;
      results.totalPages = data.total_pages;
      results.totalResults = data.total_results;
      results.results = [];
      for (let i = 0; i < data.results.length; i++) {
        const result = new Media();
        result.id = data.results[i].id;
        result.title = data.results[i].name;
        result.originalTitle = data.results[i].original_name;
        result.overview = data.results[i].overview;
        result.posterPath = data.results[i].poster_path;
        result.releaseDate = data.results[i].first_air_date;
        result.adult = false; // TMDb doesn't return adult for now
        results.results.push(result);
      }
      return results;
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async movieDetails(id: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<MovieDetails &
      {
        videos: { results: Video[] }, alternative_titles: { titles: Title[] }, translations: { translations: Translation[] },
        keywords: { keywords: MediaKeyword[] }
      }>(`${this.baseUrl}/movie/${id}`, {
        params: { language, append_to_response: 'videos,alternative_titles,translations,keywords' },
        headers: this.headers
      }));
      const data = response.data;
      const origLangTranslation = data.translations.translations.find(t => t.iso_639_1 === data.original_language);
      const result = new MediaDetails();
      result.id = data.id;
      result.title = data.title;
      result.originalTitle = data.original_title;
      result.altTitles = data.alternative_titles.titles
        .filter(t => origLangTranslation ? t.iso_3166_1 === origLangTranslation.iso_3166_1 : true)
        .map<MediaAltTitle>(t => ({
          iso31661: t.iso_3166_1,
          iso6391: origLangTranslation?.iso_639_1 || undefined,
          title: t.title,
          type: t.type
        }));
      result.overview = data.overview;
      result.posterPath = data.poster_path;
      result.backdropPath = data.backdrop_path;
      result.originalLanguage = data.original_language;
      if (data.belongs_to_collection) {
        result.collection = await this.collectionDetails(data.belongs_to_collection.id, language);
      }
      result.genres = data.genres.map(g => g.name);
      result.studios = [];
      result.productions = data.production_companies.map<Production>(p => ({
        name: p.name,
        country: p.origin_country
      }));
      result.tags = data.keywords.keywords.map(k => apStyleTitleCase(k.name));
      result.videos = data.videos.results
        .filter(v => v.site === 'YouTube' && ['Teaser', 'Trailer'].includes(v.type))
        .map<MediaVideo>(v => ({
          name: v.name,
          key: v.key,
          type: v.type,
          official: v.official
        }));
      result.runtime = data.runtime * 60 || 0;
      result.status = data.status;
      result.releaseDate = data.release_date;
      result.adult = data.adult;
      result.externalIds = new MediaExternalIds();
      result.externalIds.imdb = data.imdb_id;
      result.externalIds.tmdb = data.id;
      result.translations = data.translations.translations
        .filter(t => I18N_LANGUAGES.includes(t.iso_639_1))
        .map<MediaTranslation>(t => ({
          iso31661: t.iso_3166_1,
          iso6391: t.iso_639_1,
          name: t.name,
          englishName: t.english_name,
          data: {
            title: t.data.title,
            overview: t.data.overview
          }
        }));
      return result;
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async tvDetails(id: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<TvShowDetails &
      {
        external_ids: ExternalIds, videos: { results: Video[] }, alternative_titles: { results: Title[] },
        translations: { translations: Translation[] }, keywords: { results: MediaKeyword[] }
      }>(`${this.baseUrl}/tv/${id}`, {
        params: { language, append_to_response: 'external_ids,videos,alternative_titles,translations,keywords' },
        headers: this.headers
      }));
      const data = response.data;
      const origLangTranslation = data.translations.translations.find(t => t.iso_639_1 === data.original_language);
      const result = new MediaDetails();
      result.id = data.id;
      result.title = data.name;
      result.originalTitle = data.original_name;
      result.altTitles = data.alternative_titles.results
        .filter(t => origLangTranslation ? t.iso_3166_1 === origLangTranslation.iso_3166_1 : true)
        .map<MediaAltTitle>(t => ({
          iso31661: t.iso_3166_1,
          iso6391: origLangTranslation?.iso_639_1 || undefined,
          title: t.title,
          type: t.type
        }));
      result.overview = data.overview;
      result.posterPath = data.poster_path;
      result.backdropPath = data.backdrop_path;
      result.originalLanguage = data.original_language;
      result.genres = data.genres.map(g => g.name);
      result.studios = [];
      result.productions = data.production_companies.map<Production>(p => ({
        name: p.name,
        country: p.origin_country
      }));
      result.tags = data.keywords.results.map(k => apStyleTitleCase(k.name));
      result.videos = data.videos.results
        .filter(v => v.site === 'YouTube' && ['Teaser', 'Trailer'].includes(v.type))
        .map<MediaVideo>(v => ({
          name: v.name,
          key: v.key,
          type: v.type,
          official: v.official
        }));
      result.runtime = data.episode_run_time.shift() * 60 || 0;
      result.firstAirDate = data.first_air_date;
      result.lastAirDate = data.last_air_date;
      result.totalSeasons = data.number_of_seasons;
      result.totalEpisodes = data.number_of_episodes;
      result.status = data.status;
      result.releaseDate = data.first_air_date;
      result.adult = false;
      result.externalIds = new MediaExternalIds();
      result.externalIds.imdb = data.external_ids.imdb_id;
      result.externalIds.tmdb = data.id;
      result.seasons = data.seasons.map(s => {
        const season = new TVSeason();
        season.name = s.name;
        season.overview = s.overview;
        season.seasonNumber = s.season_number;
        season.episodeCount = s.episode_count;
        season.airDate = s.air_date;
        season.posterPath = s.poster_path;
        return season;
      });
      result.translations = data.translations.translations
        .filter(t => I18N_LANGUAGES.includes(t.iso_639_1))
        .map<MediaTranslation>(t => ({
          iso31661: t.iso_3166_1,
          iso6391: t.iso_639_1,
          name: t.name,
          englishName: t.english_name,
          data: {
            title: t.data.name,
            overview: t.data.overview
          }
        }));
      return result;
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async collectionDetails(id: string, language: string) {
    try {
      const [detailsResponse, translationResponse] = await Promise.all([
        firstValueFrom(this.httpService.get<CollectionDetails>(`${this.baseUrl}/collection/${id}`, {
          params: { language },
          headers: this.headers
        })),
        firstValueFrom(this.httpService.get<{ translations: Translation[] }>(`${this.baseUrl}/collection/${id}/translations`, {
          headers: this.headers
        }))
      ]);
      const data = detailsResponse.data;
      const result = new MediaCollection();
      result.id = data.id;
      result.name = data.name;
      result.overview = data.overview;
      result.posterPath = data.poster_path;
      result.backdropPath = data.backdrop_path;
      result.translations = translationResponse.data.translations
        .filter(t => I18N_LANGUAGES.includes(t.iso_639_1))
        .map<MediaTranslation>(t => ({
          iso31661: t.iso_3166_1,
          iso6391: t.iso_639_1,
          name: t.name,
          englishName: t.english_name,
          data: {
            title: t.data.title,
            overview: t.data.overview
          }
        }));
      return result;
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async episodeDetails(id: string, season: string, episode: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<EpisodeDetails &
      { translations: { translations: Translation[] } }>(`${this.baseUrl}/tv/${id}/season/${season}/episode/${episode}`, {
        params: { language, append_to_response: 'translations' },
        headers: this.headers
      }));
      const data = response.data;
      const result = new TVEpisode();
      result.episodeNumber = data.episode_number;
      result.name = data.name;
      result.overview = data.overview;
      result.runtime = data.runtime * 60;
      result.stillPath = data.still_path;
      result.airDate = data.air_date;
      result.translations = data.translations.translations
        .filter(t => I18N_LANGUAGES.includes(t.iso_639_1))
        .map<EpisodeTranslation>(t => ({
          iso31661: t.iso_3166_1,
          iso6391: t.iso_639_1,
          name: t.name,
          englishName: t.english_name,
          data: {
            name: t.data.name,
            overview: t.data.overview
          }
        }));
      return result;
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async movieImages(id: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<TMDBImages>(`${this.baseUrl}/movie/${id}/images`, {
        params: { language },
        headers: this.headers
      }));
      const data = response.data;
      return this.parseTMDbImageList(data);
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async tvImages(id: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<TMDBImages>(`${this.baseUrl}/tv/${id}/images`, {
        params: { language },
        headers: this.headers
      }));
      const data = response.data;
      return this.parseTMDbImageList(data);
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  parseTMDbImageList(data: TMDBImages) {
    const result = new MediaImages();
    result.posters = data.posters.map(p => {
      const poster = new MediaImageItem();
      poster.width = p.width;
      poster.height = p.height;
      poster.aspectRatio = p.aspect_ratio;
      poster.filePath = p.file_path;
      return poster;
    });
    result.backdrops = data.backdrops.map(b => {
      const backdrop = new MediaImageItem();
      backdrop.width = b.width;
      backdrop.height = b.height;
      backdrop.aspectRatio = b.aspect_ratio;
      backdrop.filePath = b.file_path;
      return backdrop;
    });
    return result;
  }
}
