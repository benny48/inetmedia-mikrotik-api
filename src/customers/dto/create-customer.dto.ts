import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'CUST0001' })
  @IsString()
  @Length(1, 120)
  code: string;

  @ApiProperty({ example: 'PT Subah Spinning Mills' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ example: 'admin@ssmindonesia.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @Length(0, 32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Biaya langganan/bulan',
    example: 250000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  subscriptionFee?: number;

  @ApiPropertyOptional({
    description: 'Jatuh tempo berikutnya (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Hari penagihan 1..28', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  billingDueDay?: number;
}
