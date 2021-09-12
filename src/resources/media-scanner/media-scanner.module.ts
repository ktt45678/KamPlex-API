import { Module } from '@nestjs/common';

import { MediaScannerService } from './media-scanner.service';
import { MediaScannerController } from './media-scanner.controller';
import { TmdbScannerModule } from '../../common/tmdb-scanner/tmdb-scanner.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TmdbScannerModule
  ],
  controllers: [MediaScannerController],
  providers: [MediaScannerService]
})
export class MediaScannerModule {}
