import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';

import { SearchMediaDto, MediaDetailsDto, MediaLanguageDto } from './dto';
import { TmdbScannerService } from '../../common/modules/tmdb-scanner/tmdb-scanner.service';

@Injectable()
export class MediaScannerService {
  constructor(private tmdbScannerService: TmdbScannerService) { }

  findAll(searchMediaDto: SearchMediaDto) {
    const { type, query, page, year, language, includeAdult } = searchMediaDto;
    if (type === 'movie')
      return this.tmdbScannerService.searchMovie(query, page, year, language, includeAdult);
    return this.tmdbScannerService.searchTv(query, page, year, language, includeAdult);
  }

  async findOne(id: string, mediaDetailsDto: MediaDetailsDto) {
    const { type, language } = mediaDetailsDto;
    if (type === 'movie') {
      const movie = await this.tmdbScannerService.movieDetails(id, language);
      return instanceToPlain(movie, { groups: ['movie'] });
    }
    const tv = await this.tmdbScannerService.tvDetails(id, language);
    return instanceToPlain(tv, { groups: ['tv'] });
  }

  async findOneEpisode(id: string, seasonNumber: string, episodeNumber: string, mediaLanguageDto: MediaLanguageDto) {
    const episode = await this.tmdbScannerService.episodeDetails(id, seasonNumber, episodeNumber, mediaLanguageDto.language);
    return instanceToPlain(episode);
  }
}
