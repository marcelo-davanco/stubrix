import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartRecordingDto {
  @ApiPropertyOptional({
    description: 'Proxy target URL for recording mode',
    example: 'https://api.example.com',
  })
  @IsOptional()
  @IsString()
  proxyTarget?: string;

  @ApiPropertyOptional({
    description: 'URL patterns to include in recording (glob patterns)',
    example: ['/api/users/*', '/api/orders/**'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({
    description: 'URL patterns to exclude from recording (glob patterns)',
    example: ['/api/health', '/api/metrics/*', '/api/status'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}
