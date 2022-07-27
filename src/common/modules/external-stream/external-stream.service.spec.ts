import { Test, TestingModule } from '@nestjs/testing';
import { ExternalStreamService } from './external-stream.service';

describe('ExternalStreamService', () => {
  let service: ExternalStreamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalStreamService],
    }).compile();

    service = module.get<ExternalStreamService>(ExternalStreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
