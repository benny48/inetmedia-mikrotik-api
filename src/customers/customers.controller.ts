// src/customers/customers.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreatePppoeDto } from './dto/create-pppoe.dto';
import { UpdatePppoeDto } from './dto/update-pppoe.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  // === customers ===
  @ApiOperation({ summary: 'List customers' })
  @ApiOkResponse({ description: 'Daftar customer' })
  @Get()
  list() {
    return this.svc.listCustomers();
  }

  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getCustomer(id);
  }

  @ApiOperation({ summary: 'Create customer' })
  @ApiCreatedResponse({ description: 'Customer created' })
  @ApiBody({ type: CreateCustomerDto })
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.createCustomer(dto);
  }

  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateCustomerDto })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.svc.updateCustomer(id, dto);
  }

  @ApiOperation({ summary: 'Delete customer' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteCustomer(id);
  }

  // === PPPoE accounts ===
  @ApiOperation({ summary: 'List PPPoE accounts by customer' })
  @ApiParam({ name: 'id' })
  @Get(':id/pppoe')
  listPppoe(@Param('id') id: string) {
    return this.svc.listPppoeByCustomer(id);
  }

  @ApiOperation({ summary: 'Create PPPoE account for customer' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: CreatePppoeDto })
  @ApiCreatedResponse({ description: 'PPPoE account created' })
  @Post(':id/pppoe')
  createPppoe(@Param('id') id: string, @Body() dto: CreatePppoeDto) {
    return this.svc.createPppoe(id, dto);
  }

  @ApiOperation({ summary: 'Update PPPoE account' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'accId' })
  @ApiBody({ type: UpdatePppoeDto })
  @Put(':id/pppoe/:accId')
  updatePppoe(
    @Param('id') id: string,
    @Param('accId') accId: string,
    @Body() dto: UpdatePppoeDto,
  ) {
    return this.svc.updatePppoe(id, accId, dto);
  }

  @ApiOperation({ summary: 'Delete PPPoE account' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'accId' })
  @Delete(':id/pppoe/:accId')
  deletePppoe(@Param('id') id: string, @Param('accId') accId: string) {
    return this.svc.deletePppoe(id, accId);
  }

  // === payments ===
  @ApiOperation({ summary: 'List payments' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'paidOnly', required: false, example: 'true|false' })
  @Get(':id/payments')
  listPayments(
    @Param('id') id: string,
    @Query('paidOnly') paidOnly: 'true' | 'false' = 'true',
  ) {
    return this.svc.listPayments(id, paidOnly !== 'false');
  }

  @ApiOperation({ summary: 'Create payment' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiCreatedResponse({ description: 'Payment created' })
  @Post(':id/payments')
  createPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.svc.createPayment(id, dto);
  }

  @ApiOperation({ summary: 'Update payment' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'paymentId' })
  @ApiBody({ type: UpdatePaymentDto })
  @Put(':id/payments/:paymentId')
  updatePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.svc.updatePayment(id, paymentId, dto);
  }

  @ApiOperation({ summary: 'Mark payment as PAID' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'paymentId' })
  @Put(':id/payments/:paymentId/mark-paid')
  markPaymentPaid(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.svc.markPaymentPaid(id, paymentId);
  }

  @ApiOperation({ summary: 'Delete payment' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'paymentId' })
  @Delete(':id/payments/:paymentId')
  deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.svc.deletePayment(id, paymentId);
  }

  // === manual trigger isolir ===
  @ApiOperation({ summary: 'Run billing isolation check now' })
  @Post('billing/check-now')
  enforceNow() {
    return this.svc.enforceIsolationNow();
  }
}
