import { Test, TestingModule } from '@nestjs/testing';
import { MediaScannerService } from './media-scanner.service';

describe('MediaScannerService', () => {
  let service: MediaScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaScannerService],
    }).compile();

    service = module.get<MediaScannerService>(MediaScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
