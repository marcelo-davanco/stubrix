import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartRecordingDto {
  @ApiPropertyOptional({
    description: 'Proxy target URL for recording mode',
    example: 'https://api.example.com',
  })
  @IsOptional()
  @IsString()
  proxyTarget?: string;
}
