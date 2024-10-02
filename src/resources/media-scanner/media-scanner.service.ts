import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';

import { SearchMediaDto, MediaDetailsDto, FindTVEpisodeDto } from './dto';
import { TmdbScannerService } from '../../common/modules/tmdb-scanner/tmdb-scanner.service';
import { TvdbScannerService } from '../../common/modules/tvdb-scanner/tvdb-scanner.service';

@Injectable()
export class MediaScannerService {
  constructor(private tmdbScannerService: TmdbScannerService, private tvdbScannerService: TvdbScannerService) { }

  findAll(searchMediaDto: SearchMediaDto) {
    const { provider, type, query, page, year, language, includeAdult } = searchMediaDto;
    if (!provider || provider === 'tmdb') {
      if (type === 'movie')
        return this.tmdbScannerService.searchMovie(query, page, year, language, includeAdult);
      return this.tmdbScannerService.searchTv(query, page, year, language, includeAdult);
    } else {
      const tvdbType = type === 'movie' ? 'movie' : 'series';
      return this.tvdbScannerService.search(query, page, year, language, tvdbType);
    }
  }

  async findOne(id: string, mediaDetailsDto: MediaDetailsDto) {
    const { provider, type, language } = mediaDetailsDto;
    if (!provider || provider === 'tmdb') {
      if (type === 'movie') {
        const movie = await this.tmdbScannerService.movieDetails(id, language);
        return instanceToPlain(movie, { groups: ['movie'] });
      }
      const tv = await this.tmdbScannerService.tvDetails(id, language);
      return instanceToPlain(tv, { groups: ['tv'] });
    } else {
      if (type === 'movie') {
        const movie = await this.tvdbScannerService.movieDetails(id, language);
        return instanceToPlain(movie, { groups: ['movie'] });
      }
      const tv = await this.tvdbScannerService.tvDetails(id, language);
      return instanceToPlain(tv, { groups: ['tv'] });
    }
  }

  async findImages(id: string, mediaDetailsDto: MediaDetailsDto) {
    const { provider, type, language } = mediaDetailsDto;
    if (!provider || provider === 'tmdb') {
      if (type === 'movie') {
        const movie = await this.tmdbScannerService.movieImages(id, language);
        return instanceToPlain(movie);
      }
      const tv = await this.tmdbScannerService.tvImages(id, language);
      return instanceToPlain(tv);
    } else {
      if (type === 'movie') {
        const movie = await this.tvdbScannerService.movieImages(id, language);
        return instanceToPlain(movie);
      }
      const tv = await this.tvdbScannerService.tvImages(id, language);
      return instanceToPlain(tv);
    }
  }

  async findOneEpisode(id: string, seasonNumber: string, episodeNumber: string, findTVEpisodeDto: FindTVEpisodeDto) {
    const { provider, language } = findTVEpisodeDto;
    if (!provider || provider === 'tmdb') {
      const episode = await this.tmdbScannerService.episodeDetails(id, seasonNumber, episodeNumber, language);
      return instanceToPlain(episode);
    } else {
      const episode = await this.tvdbScannerService.episodeDetails(id, seasonNumber, episodeNumber, language);
      return instanceToPlain(episode);
    }
  }
}
