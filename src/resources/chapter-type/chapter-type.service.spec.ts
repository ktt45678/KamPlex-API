import { Test, TestingModule } from '@nestjs/testing';
import { ChapterTypeService } from './chapter-type.service';

describe('ChapterTypeService', () => {
  let service: ChapterTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChapterTypeService],
    }).compile();

    service = module.get<ChapterTypeService>(ChapterTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
