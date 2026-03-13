import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPasswordDto {
  @ApiProperty()
  @IsString()
  password: string;
}
