import { Test, TestingModule } from '@nestjs/testing';
import { MikrotikController } from './mikrotik.controller';

describe('MikrotikController', () => {
  let controller: MikrotikController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MikrotikController],
    }).compile();

    controller = module.get<MikrotikController>(MikrotikController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
