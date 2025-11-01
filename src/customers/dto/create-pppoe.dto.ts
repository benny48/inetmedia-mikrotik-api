import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreatePppoeDto {
  @ApiProperty({ example: 'user01@realm' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ example: 'secret' })
  @IsString()
  @Length(1, 200)
  password: string;

  @ApiPropertyOptional({ enum: ['pppoe', 'any'], default: 'pppoe' })
  @IsOptional()
  @IsIn(['pppoe', 'any'])
  service?: 'pppoe' | 'any';

  @ApiPropertyOptional({ example: 'Paket-20MB' })
  @IsOptional()
  @IsString()
  profile?: string;

  @ApiPropertyOptional({ description: 'local-address', example: '10.0.0.1' })
  @IsOptional()
  @IsString()
  localAddress?: string;

  @ApiPropertyOptional({
    description: 'remote-address (pool or IP)',
    example: 'pppoe-pool',
  })
  @IsOptional()
  @IsString()
  remoteAddress?: string;

  @ApiPropertyOptional({ description: 'caller-id', example: '' })
  @IsOptional()
  @IsString()
  callerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;

  @ApiPropertyOptional({
    description: 'disabled (boolean local → "true"/"false" ke RouterOS)',
  })
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}
