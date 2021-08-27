import { Test, TestingModule } from '@nestjs/testing';
import { ExternalStoragesController } from './external-storages.controller';

describe('ExternalStoragesController', () => {
  let controller: ExternalStoragesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalStoragesController],
    }).compile();

    controller = module.get<ExternalStoragesController>(ExternalStoragesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
