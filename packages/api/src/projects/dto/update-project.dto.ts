import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Updated project name',
    example: 'Updated E-commerce API Mocks',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated proxy target URL or null to disable',
    example: 'https://new-api.ecommerce.com',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  proxyTarget?: string | null;

  @ApiPropertyOptional({
    description: 'Updated project description',
    example: 'Updated mock server for e-commerce API endpoints',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
