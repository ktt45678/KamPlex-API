import { Test, TestingModule } from '@nestjs/testing';
import { TmdbScannerService } from './tmdb-scanner.service';

describe('TmdbScannerService', () => {
  let service: TmdbScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TmdbScannerService],
    }).compile();

    service = module.get<TmdbScannerService>(TmdbScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
