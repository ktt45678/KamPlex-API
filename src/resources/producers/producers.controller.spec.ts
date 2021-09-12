import { Test, TestingModule } from '@nestjs/testing';
import { ProducersController } from './producers.controller';
import { ProducersService } from './producers.service';

describe('ProducersController', () => {
  let controller: ProducersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProducersController],
      providers: [ProducersService],
    }).compile();

    controller = module.get<ProducersController>(ProducersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
