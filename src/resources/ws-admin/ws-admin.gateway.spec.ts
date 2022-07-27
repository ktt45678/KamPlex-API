import { Test, TestingModule } from '@nestjs/testing';
import { WsAdminGateway } from './ws-admin.gateway';

describe('WsAdminGateway', () => {
  let gateway: WsAdminGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WsAdminGateway],
    }).compile();

    gateway = module.get<WsAdminGateway>(WsAdminGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
