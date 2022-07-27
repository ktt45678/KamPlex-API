import { Test, TestingModule } from '@nestjs/testing';
import { OnedriveService } from './onedrive.service';

describe('OnedriveService', () => {
  let service: OnedriveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnedriveService],
    }).compile();

    service = module.get<OnedriveService>(OnedriveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
