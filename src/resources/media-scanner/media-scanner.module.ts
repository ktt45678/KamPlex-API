import { Module } from '@nestjs/common';

import { MediaScannerService } from './media-scanner.service';
import { MediaScannerController } from './media-scanner.controller';
import { TmdbScannerModule } from '../../common/modules/tmdb-scanner/tmdb-scanner.module';
import { TvdbScannerModule } from '../../common/modules/tvdb-scanner/tvdb-scanner.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TmdbScannerModule,
    TvdbScannerModule
  ],
  controllers: [MediaScannerController],
  providers: [MediaScannerService]
})
export class MediaScannerModule { }
