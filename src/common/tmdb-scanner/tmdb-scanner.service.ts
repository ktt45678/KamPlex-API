import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { StatusCode } from '../../enums/status-code.enum';
import { Paginated } from '../../resources/roles/entities/paginated.entity';
import { Media } from '../../resources/media/media-scanner/entities/media.entity';
import { MediaDetails } from '../../resources/media/media-scanner/entities/media-details.entity';
import { MediaExternalIds } from '../../resources/media/media-scanner/entities/media-external-ids.entity';
import { Search, Movie, TV, MovieDetails, TvShowDetails, ExternalIds } from './interfaces';

@Injectable()
export class TmdbScannerService {
  constructor(private httpService: HttpService) { }

  async searchMovie(query: string, page: number, year: number, language: string, includeAdult: boolean) {
    try {
      const response = await firstValueFrom(this.httpService.get<Search<Movie>>('search/movie', { params: { query, page, primary_release_year: year, language, include_adult: includeAdult } }));
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
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async searchTv(query: string, page: number, year: number, language: string, includeAdult: boolean) {
    try {
      const response = await firstValueFrom(this.httpService.get<Search<TV>>('search/tv', { params: { query, page, primary_release_year: year, language, include_adult: includeAdult } }));
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
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async movieDetails(id: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<MovieDetails>(`movie/${id}`, { params: { language } }));
      const data = response.data;
      const result = new MediaDetails();
      result.id = data.id;
      result.title = data.title;
      result.originalTitle = data.original_title;
      result.overview = data.overview;
      result.posterPath = data.poster_path;
      result.backdropPath = data.backdrop_path;
      result.genres = data.genres.map(g => g.name);
      result.runtime = data.runtime;
      result.status = data.status;
      result.releaseDate = data.release_date;
      result.adult = data.adult;
      result.externalIds = new MediaExternalIds();
      result.externalIds.imdb = data.imdb_id;
      result.externalIds.tmdb = data.id;
      return result;
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }

  async tvDetails(id: string, language: string) {
    try {
      const response = await firstValueFrom(this.httpService.get<TvShowDetails & { external_ids: ExternalIds }>(`tv/${id}`,
        { params: { language, append_to_response: 'external_ids' } }));
      const data = response.data;
      const result = new MediaDetails();
      result.id = data.id;
      result.title = data.name;
      result.originalTitle = data.original_name;
      result.overview = data.overview;
      result.posterPath = data.poster_path;
      result.backdropPath = data.backdrop_path;
      result.genres = data.genres.map(g => g.name);
      result.runtime = data.episode_run_time.shift();
      result.episodeRuntime = data.episode_run_time;
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
      return result;
    } catch (e) {
      if (e.isAxiosError) {
        console.error(e.response);
        throw new HttpException({ code: StatusCode.THRID_PARTY_REQUEST_FAILED, message: `Received ${e.response.status} ${e.response.statusText} error from third party api` }, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw e;
    }
  }
}