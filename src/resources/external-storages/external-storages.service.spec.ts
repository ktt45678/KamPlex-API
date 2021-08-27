import { Test, TestingModule } from '@nestjs/testing';
import { ExternalStoragesService } from './external-storages.service';

describe('ExternalStoragesService', () => {
  let service: ExternalStoragesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalStoragesService],
    }).compile();

    service = module.get<ExternalStoragesService>(ExternalStoragesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
