import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TmdbScannerService } from './tmdb-scanner.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: 'https://api.themoviedb.org/3/',
        headers: { 'Authorization': `Bearer ${configService.get<string>('TMDB_ACCESS_TOKEN')}` }
      })
    })
  ],
  providers: [TmdbScannerService],
  exports: [TmdbScannerService]
})
export class TmdbScannerModule { }
