import { Test, TestingModule } from '@nestjs/testing';
import { ImagekitService } from './imagekit.service';

describe('ImagekitService', () => {
  let service: ImagekitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImagekitService],
    }).compile();

    service = module.get<ImagekitService>(ImagekitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
