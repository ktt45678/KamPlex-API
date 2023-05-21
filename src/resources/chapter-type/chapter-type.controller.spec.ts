import { Test, TestingModule } from '@nestjs/testing';
import { ChapterTypeController } from './chapter-type.controller';
import { ChapterTypeService } from './chapter-type.service';

describe('ChapterTypeController', () => {
  let controller: ChapterTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChapterTypeController],
      providers: [ChapterTypeService],
    }).compile();

    controller = module.get<ChapterTypeController>(ChapterTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
