import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, RetryConfig } from 'rxjs';
import { AxiosError } from 'axios';
import ISO6391 from 'iso-639-1';

import { Alias, ArtworkBaseRecord, Company, EpisodeExtendedRecord, MovieExtendedRecord, PaginatedResponse, SearchResult, SeasonBaseRecord, SeriesCompany, SeriesExtendedRecord, Trailer, Translation, TVDBResponse } from './interfaces';
import { Paginated } from '../../entities';
import { EpisodeTranslation, Media, MediaAltTitle, MediaDetails, MediaImageItem, MediaImages, MediaTranslation, MediaVideo, Production, TVEpisode, TVSeason } from '../../../resources/media-scanner/entities';
import { TmdbScannerService } from '../tmdb-scanner/tmdb-scanner.service';
import { StatusCode } from '../../../enums';
import { languageCodeHelper } from '../../../utils';
import { I18N_LANGUAGES } from '../../../config';
import { SeasonExtendedRecord } from './interfaces/season-extended-record.interface';

type SearchType = 'movie' | 'series';

@Injectable()
export class TvdbScannerService {
  private baseUrl = 'https://api4.thetvdb.com/v4';
  private headers: any = {};
  private tokenExpiry: Date | null = null;
  private youtubeTrailerRegex = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;

  constructor(private httpService: HttpService, private configService: ConfigService,
    private tmdbScannerService: TmdbScannerService) { }

  async refreshToken() {
    if (this.tokenExpiry && this.tokenExpiry > new Date())
      return;
    const tvdbApiKey = this.configService.get<string>('TVBD_API_KEY');
    const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/login`, { apikey: tvdbApiKey }));
    const token = response.data.data.token;
    this.headers = { 'Authorization': `Bearer ${token}` };
    this.tokenExpiry = new Date();
    this.tokenExpiry.setDate(this.tokenExpiry.getDate() + 30);
    this.tokenExpiry.setHours(this.tokenExpiry.getHours() - 1);
  }

  async search(query: string, page: number, year: number, language: string, type: SearchType) {
    try {
      await this.refreshToken();
      const selectedLangCodes = languageCodeHelper.getByISO63912(language?.substring(0, 2) || 'en');
      const response = await firstValueFrom(this.httpService.get<PaginatedResponse<SearchResult[]>>(`${this.baseUrl}/search`,
        {
          params: { query, page: page - 1, year, type },
          transformRequest: (data, headers) => {
            headers.set(this.headers);
            return data;
          }
        }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const data = response.data;
      const results = new Paginated<Media>();
      results.page = page;
      results.totalPages = data.links.page_size;
      results.totalResults = data.links.total_items;
      results.results = [];
      for (let i = 0; i < data.data.length; i++) {
        const result = new Media();
        result.id = Number(data.data[i].tvdb_id) || 0;
        result.title = data.data[i].translations?.[selectedLangCodes.iso639_2] || data.data[i].name;
        result.originalTitle = data.data[i].name;
        result.overview = data.data[i].overviews?.[selectedLangCodes.iso639_2] || data.data[i].overview;
        result.posterPath = data.data[i].image_url;
        result.releaseDate = data.data[i].first_air_time;
        result.adult = false;
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
      await this.refreshToken();
      const response = await firstValueFrom(this.httpService.get<TVDBResponse<MovieExtendedRecord>>(`${this.baseUrl}/movies/${id}/extended`, {
        params: { meta: 'translations' },
        transformRequest: (data, headers) => {
          headers.set(this.headers);
          return data;
        }
      }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const data = response.data.data;
      const selectedLangCodes = languageCodeHelper.getByISO63912(language?.substring(0, 2) || 'en');
      const langNameTranslation = data.translations.nameTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
      const langOverviewTranslation = data.translations.overviewTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
      const langNameAlias = data.aliases.find(t => t.language === selectedLangCodes.iso639_2);
      const origLangNameTranslation = data.translations.nameTranslations?.find(t => t.language === data.originalLanguage);
      const origLangOverviewTranslation = data.translations.overviewTranslations?.find(t => t.language === data.originalLanguage);
      const tmdbId = data.remoteIds?.find(r => r.type === 12)?.id; // Type 12: TheMovieDB.com
      const movieDetailsFromTMDB = tmdbId ? await this.tmdbScannerService.movieDetails(tmdbId, language) : null;
      const result = new MediaDetails();
      result.id = data.id;
      result.title = langNameTranslation?.name || langNameAlias.name || movieDetailsFromTMDB?.title || data.name;
      result.originalTitle = data.name || movieDetailsFromTMDB?.originalTitle;
      result.altTitles = this.mapAltTitles(data.aliases, origLangNameTranslation, movieDetailsFromTMDB?.altTitles);
      result.overview = langOverviewTranslation?.overview || movieDetailsFromTMDB?.overview || origLangOverviewTranslation?.overview;
      result.posterPath = data.image || data.artworks?.find(a => a.type === 14)?.image || movieDetailsFromTMDB?.posterPath || '';
      result.backdropPath = data.artworks?.find(a => a.type === 15)?.image || movieDetailsFromTMDB?.backdropPath || '';
      result.originalLanguage = languageCodeHelper.getByISO63913(data.originalLanguage)?.iso639_1;
      result.collection = movieDetailsFromTMDB?.collection;
      result.genres = data.genres.map(g => g.name);
      result.studios = this.mapCompanies(data.companies.studio);
      result.productions = this.mapCompanies(data.companies.production);
      result.tags = data.tagOptions?.map(k => k.name) || [];
      result.videos = this.mapVideos(data.trailers);
      result.runtime = data.runtime * 60 || 0;
      result.status = data.status.id === 5 ? 'Released' : 'Upcoming';
      result.releaseDate = data.first_release.date;
      result.adult = false;
      result.externalIds = movieDetailsFromTMDB?.externalIds;
      if (!result.tags?.length)
        result.tags = movieDetailsFromTMDB?.tags;
      result.translations = [];
      I18N_LANGUAGES.forEach(i18nLang => {
        const languageCodes = languageCodeHelper.getByISO63912(i18nLang);
        const [iso6391Lang] = ISO6391.getLanguages([i18nLang]);
        const nameTranslation = data.translations.nameTranslations?.find(t => t.language === languageCodes.iso639_2);
        const overviewTranslation = data.translations.overviewTranslations?.find(t => t.language === languageCodes.iso639_2);
        if (nameTranslation || overviewTranslation) {
          const mediaTranslation: MediaTranslation = {
            iso31661: languageCodes?.iso3166_1,
            iso6391: i18nLang,
            name: iso6391Lang.nativeName,
            englishName: iso6391Lang.name,
            data: {
              title: nameTranslation?.name || '',
              overview: overviewTranslation?.overview || ''
            }
          }
          result.translations.push(mediaTranslation);
        }
      });
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
      await this.refreshToken();
      const response = await firstValueFrom(this.httpService.get<TVDBResponse<SeriesExtendedRecord>>(`${this.baseUrl}/series/${id}/extended`, {
        params: { meta: 'translations' },
        transformRequest: (data, headers) => {
          headers.set(this.headers);
          return data;
        }
      }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const data = response.data.data;
      const selectedLangCodes = languageCodeHelper.getByISO63912(language?.substring(0, 2) || 'en');
      const langNameTranslation = data.translations.nameTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
      const langOverviewTranslation = data.translations.overviewTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
      const langNameAlias = data.aliases.find(t => t.language === selectedLangCodes.iso639_2);
      const origLangNameTranslation = data.translations.nameTranslations?.find(t => t.language === data.originalLanguage);
      const origLangOverviewTranslation = data.translations.overviewTranslations?.find(t => t.language === data.originalLanguage);
      const tmdbId = data.remoteIds?.find(r => r.type === 12)?.id; // Type 12: TheMovieDB.com
      const tvDetailsFromTMDB = tmdbId ? await this.tmdbScannerService.tvDetails(tmdbId, language) : null;
      const result = new MediaDetails();
      result.id = data.id;
      result.title = langNameTranslation?.name || langNameAlias.name || tvDetailsFromTMDB?.title || data.name;
      result.originalTitle = data.name;
      result.altTitles = this.mapAltTitles(data.aliases, origLangNameTranslation, tvDetailsFromTMDB?.altTitles);
      result.overview = langOverviewTranslation?.overview || tvDetailsFromTMDB?.overview || origLangOverviewTranslation.overview;
      result.posterPath = data.image || data.artworks?.find(a => a.type === 14)?.image || tvDetailsFromTMDB?.posterPath || '';
      result.backdropPath = data.artworks?.find(a => a.type === 15)?.image || tvDetailsFromTMDB?.backdropPath || '';
      result.originalLanguage = languageCodeHelper.getByISO63913(data.originalLanguage)?.iso639_1;
      result.collection = tvDetailsFromTMDB?.collection;
      result.genres = data.genres.map(g => g.name);
      result.studios = this.mapCompanies(data.companies?.filter(c => c.companyType?.companyTypeId === 2)); // Type 2: Studio
      result.productions = this.mapCompanies(data.companies?.filter(c => c.companyType?.companyTypeId === 1)); // Type 1: Production
      result.tags = data.tags?.map(k => k.name) || [];
      result.videos = this.mapVideos(data.trailers);
      result.runtime = data.averageRuntime * 60 || 0;
      result.status = data.status.id === 1 ? 'Airing' : data.status.id === 2 ? 'Aired' : 'Upcoming';
      result.releaseDate = data.firstAired;
      result.adult = false;
      result.externalIds = tvDetailsFromTMDB?.externalIds;
      if (!result.tags?.length)
        result.tags = tvDetailsFromTMDB?.tags;
      result.firstAirDate = data.firstAired;
      result.lastAirDate = data.lastAired;
      result.totalSeasons = data.seasons?.filter(s => s.type?.type === 'official').length || 0;
      result.totalEpisodes = 0;
      result.seasons = [];
      if (data.seasons) {
        for (let i = 0; i < data.seasons.length; i++) {
          const season = new TVSeason();
          const s = data.seasons[i];
          if (s.type?.type !== 'official')
            continue;
          const seasonResponse = await firstValueFrom(this.httpService.get<TVDBResponse<SeasonExtendedRecord>>(`${this.baseUrl}/seasons/${s.id}/extended`, {
            params: { meta: 'translations' },
            transformRequest: (data, headers) => {
              headers.set(this.headers);
              return data;
            }
          }).pipe(retry(this.getUnauthorizedRetryConfig())));
          const seasonData = seasonResponse.data.data;
          const langNameTranslation = seasonData.translations.nameTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
          const langOverviewTranslation = seasonData.translations.overviewTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
          season.name = langNameTranslation?.name || '';
          season.overview = langOverviewTranslation?.overview || '';
          season.seasonNumber = seasonData.number;
          season.episodeCount = seasonData.episodes?.length || 0;
          season.airDate = seasonData.episodes?.[0]?.aired;
          season.posterPath = seasonData.image;
          result.seasons.push(season);
          result.totalEpisodes += season.episodeCount;
        }
      }
      result.translations = [];
      I18N_LANGUAGES.forEach(i18nLang => {
        const languageCodes = languageCodeHelper.getByISO63912(i18nLang);
        const [iso6391Lang] = ISO6391.getLanguages([i18nLang]);
        const nameTranslation = data.translations.nameTranslations?.find(t => t.language === languageCodes.iso639_2);
        const overviewTranslation = data.translations.overviewTranslations?.find(t => t.language === languageCodes.iso639_2);
        if (nameTranslation || overviewTranslation) {
          const mediaTranslation: MediaTranslation = {
            iso31661: languageCodes?.iso3166_1,
            iso6391: i18nLang,
            name: iso6391Lang.nativeName,
            englishName: iso6391Lang.name,
            data: {
              title: nameTranslation?.name || '',
              overview: overviewTranslation?.overview || ''
            }
          }
          result.translations.push(mediaTranslation);
        }
      });
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
      await this.refreshToken();
      const episodeQueryResponse = await firstValueFrom(this.httpService.get<TVDBResponse<SeriesExtendedRecord>>(`${this.baseUrl}/series/${id}/episodes/default`, {
        params: { page: 1, season, episodeNumber: episode },
        transformRequest: (data, headers) => {
          headers.set(this.headers);
          return data;
        }
      }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const episodeId = episodeQueryResponse.data.data.episodes?.[0]?.id;
      if (!episodeId)
        throw new HttpException({ code: StatusCode.EPISODE_NOT_FOUND, message: 'Episode not found' }, HttpStatus.NOT_FOUND);
      const response = await firstValueFrom(this.httpService.get<TVDBResponse<EpisodeExtendedRecord>>(`${this.baseUrl}/episodes/${episodeId}/extended`, {
        params: { meta: 'translations' },
        transformRequest: (data, headers) => {
          headers.set(this.headers);
          return data;
        }
      }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const data = response.data.data;
      const selectedLangCodes = languageCodeHelper.getByISO63912(language?.substring(0, 2) || 'en');
      const langNameTranslation = data.translations.nameTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
      const langOverviewTranslation = data.translations.overviewTranslations?.find(t => t.language === selectedLangCodes.iso639_2);
      const result = new TVEpisode();
      result.episodeNumber = data.number;
      result.name = langNameTranslation?.name || data.name;
      result.overview = langOverviewTranslation?.overview || data.overview;
      result.runtime = data.runtime * 60;
      result.stillPath = data.image;
      result.airDate = data.aired;
      result.translations = [];
      I18N_LANGUAGES.forEach(i18nLang => {
        const languageCodes = languageCodeHelper.getByISO63912(i18nLang);
        const [iso6391Lang] = ISO6391.getLanguages([i18nLang]);
        const nameTranslation = data.translations.nameTranslations?.find(t => t.language === languageCodes.iso639_2);
        const overviewTranslation = data.translations.overviewTranslations?.find(t => t.language === languageCodes.iso639_2);
        if (nameTranslation || overviewTranslation) {
          const episodeTranslation: EpisodeTranslation = {
            iso31661: languageCodes?.iso3166_1,
            iso6391: i18nLang,
            name: iso6391Lang.nativeName,
            englishName: iso6391Lang.name,
            data: {
              name: nameTranslation?.name || '',
              overview: overviewTranslation?.overview || ''
            }
          }
          result.translations.push(episodeTranslation);
        }
      });
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
      await this.refreshToken();
      const response = await firstValueFrom(this.httpService.get<TVDBResponse<MovieExtendedRecord>>(`${this.baseUrl}/movies/${id}/extended`, {
        transformRequest: (data, headers) => {
          headers.set(this.headers);
          return data;
        }
      }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const data = response.data.data;
      return this.parseTVDbImageList(data.artworks);
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
      await this.refreshToken();
      const response = await firstValueFrom(this.httpService.get<TVDBResponse<SeriesExtendedRecord>>(`${this.baseUrl}/series/${id}/artworks`, {
        params: { lang: language },
        transformRequest: (data, headers) => {
          headers.set(this.headers);
          return data;
        }
      }).pipe(retry(this.getUnauthorizedRetryConfig())));
      const data = response.data.data;
      return this.parseTVDbImageList(data.artworks);
    } catch (e) {
      if (e.isAxiosError && e.response) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  parseTVDbImageList(artworks: ArtworkBaseRecord[]) {
    const result = new MediaImages();
    if (!artworks)
      return result;
    // Type 2: TV Show Poster, Type 14: Movie Poster
    result.posters = artworks.filter(p => [2, 14].includes(p.type)).map(p => {
      const poster = new MediaImageItem();
      poster.width = p.width;
      poster.height = p.height;
      poster.aspectRatio = p.width / p.height;
      poster.filePath = p.image;
      return poster;
    });
    // Type 3: TV Show Backdrop, Type 15: Movie Backdrop
    result.backdrops = artworks.filter(p => [3, 15].includes(p.type)).map(b => {
      const backdrop = new MediaImageItem();
      backdrop.width = b.width;
      backdrop.height = b.height;
      backdrop.aspectRatio = b.width / b.height;
      backdrop.filePath = b.image;
      return backdrop;
    });
    return result;
  }

  private mapCompanies(companies: Company[] | SeriesCompany[]) {
    if (!companies?.length)
      return [];
    return companies.map<Production>((p: Company | SeriesCompany) => {
      const languageCodes = languageCodeHelper.getByISO31663(p.country);
      return {
        name: p.name,
        country: languageCodes?.iso3166_1 || ''
      }
    });
  }

  private mapVideos(videos: Trailer[]) {
    if (!videos?.length)
      return [];
    return videos.filter(v => v.url.includes('youtube') || v.url.includes('youtu.be'))
      .map<MediaVideo>(v => {
        const urlMatch = v.url?.match(this.youtubeTrailerRegex) || ['', ''];
        return {
          name: v.name,
          key: urlMatch[1],
          type: v.name,
          official: true
        };
      });
  }

  private mapAltTitles(aliases: Alias[], origLangNameTranslation: Translation, tmdbAltTitles?: MediaAltTitle[]) {
    if (!aliases?.length)
      return tmdbAltTitles;
    return aliases
      .filter(t => origLangNameTranslation ? t.language === origLangNameTranslation.language : false)
      .map<MediaAltTitle>(t => {
        const languageCodes = languageCodeHelper.getByISO63913(t.language);
        return {
          iso31661: languageCodes?.iso3166_1,
          iso6391: languageCodes?.iso639_1,
          title: t.name,
          type: languageCodes?.iso639_1
        };
      });
  }

  private getUnauthorizedRetryConfig(): RetryConfig {
    return {
      count: 1,
      delay: (error: AxiosError) => {
        if (error.isAxiosError && error.response?.status !== 401)
          throw error;
        return this.refreshToken();
      }
    }
  }
}
