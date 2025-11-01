import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 250000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Lunas?', example: true })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @ApiPropertyOptional({
    description: 'Waktu pelunasan (ISO)',
    example: '2025-11-01T12:00:00+07:00',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: 'transfer' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'INV-2025-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Pembayaran November 2025' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Periode bulan 1..12', example: 11 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional({ description: 'Periode tahun', example: 2025 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(9999)
  periodYear?: number;
}
