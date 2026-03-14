import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'E-commerce API Mocks',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Proxy target URL for recording mode',
    example: 'https://api.ecommerce.com',
  })
  @IsOptional()
  @IsString()
  proxyTarget?: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Mock server for e-commerce API endpoints',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
