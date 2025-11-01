import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { PppoeAccount } from './entities/pppoe-account.entity';
import { Payment } from './entities/payment.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, PppoeAccount, Payment]),
    HttpModule,
  ],
  providers: [CustomersService, MikrotikService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
