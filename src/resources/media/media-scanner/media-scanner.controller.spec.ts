import { Test, TestingModule } from '@nestjs/testing';
import { MediaScannerController } from './media-scanner.controller';
import { MediaScannerService } from './media-scanner.service';

describe('MediaScannerController', () => {
  let controller: MediaScannerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaScannerController],
      providers: [MediaScannerService],
    }).compile();

    controller = module.get<MediaScannerController>(MediaScannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
