import { Injectable } from '@nestjs/common';

import { CreateMediaScannerDto } from './dto/create-media-scanner.dto';
import { UpdateMediaScannerDto } from './dto/update-media-scanner.dto';
import { TmdbScannerService } from '../../common/tmdb-scanner/tmdb-scanner.service';
import { SearchMediaDto } from './dto/search-media.dto';
import { MediaDetailsDto } from './dto/media-details.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class MediaScannerService {
  constructor(private tmdbScannerService: TmdbScannerService) { }

  create(createMediaScannerDto: CreateMediaScannerDto) {
    return 'This action adds a new mediaScanner';
  }

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

  update(id: number, updateMediaScannerDto: UpdateMediaScannerDto) {
    return `This action updates a #${id} mediaScanner`;
  }

  remove(id: number) {
    return `This action removes a #${id} mediaScanner`;
  }
}
