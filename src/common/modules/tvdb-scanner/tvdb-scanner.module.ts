import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TvdbScannerService } from './tvdb-scanner.service';
import { TmdbScannerModule } from '../tmdb-scanner/tmdb-scanner.module';

@Module({
  imports: [
    HttpModule,
    TmdbScannerModule
  ],
  providers: [TvdbScannerService],
  exports: [TvdbScannerService]
})
export class TvdbScannerModule {}
