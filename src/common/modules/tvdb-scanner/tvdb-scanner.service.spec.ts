import { Test, TestingModule } from '@nestjs/testing';
import { TvdbScannerService } from './tvdb-scanner.service';

describe('TvdbScannerService', () => {
  let service: TvdbScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TvdbScannerService],
    }).compile();

    service = module.get<TvdbScannerService>(TvdbScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
