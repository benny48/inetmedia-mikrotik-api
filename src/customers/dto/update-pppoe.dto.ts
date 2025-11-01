import { PartialType } from '@nestjs/swagger';
import { CreatePppoeDto } from './create-pppoe.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdatePppoeDto extends PartialType(CreatePppoeDto) {
  // name biasanya tidak diubah; tapi kalau mau izinkan rename, uncomment:
  // @ApiPropertyOptional({ description: 'Rename PPP username' })
  // @IsOptional()
  // @IsString()
  // @Length(1, 200)
  // name?: string;

  @ApiPropertyOptional({ description: 'Ganti password' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  password?: string;
}
