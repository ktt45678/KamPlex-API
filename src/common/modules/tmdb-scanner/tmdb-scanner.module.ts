import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TmdbScannerService } from './tmdb-scanner.service';

@Module({
  imports: [HttpModule],
  providers: [TmdbScannerService],
  exports: [TmdbScannerService]
})
export class TmdbScannerModule { }
