// src/mikrotik/mikrotik.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MikrotikService } from './mikrotik.service';
import { MikroTikController } from './mikrotik.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule],
  providers: [MikrotikService],
  controllers: [MikroTikController],
  exports: [MikrotikService],
})
export class MikrotikModule {}
