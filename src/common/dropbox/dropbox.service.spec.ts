import { Test, TestingModule } from '@nestjs/testing';
import { DropboxService } from './dropbox.service';

describe('DropboxService', () => {
  let service: DropboxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DropboxService],
    }).compile();

    service = module.get<DropboxService>(DropboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
