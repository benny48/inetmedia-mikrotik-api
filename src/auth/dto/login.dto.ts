import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'email atau username' })
  @IsString()
  login: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  password: string;
}
