import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
  IsEnum,
  IsPositive,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type StateEngine = 'postgres' | 'mysql' | 'sqlite';

export class StatefulMockRequestDto {
  @ApiProperty({ example: 'GET' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiPropertyOptional({ example: '/api/users' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ example: '/api/users/.*' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ example: '/api/users' })
  @IsOptional()
  @IsString()
  urlPath?: string;

  @ApiPropertyOptional({ example: '/api/users/.*' })
  @IsOptional()
  @IsString()
  urlPathPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  bodyPatterns?: unknown[];
}

export class StateConfigDto {
  @ApiProperty({ enum: ['postgres', 'mysql', 'sqlite'], example: 'postgres' })
  @IsEnum(['postgres', 'mysql', 'sqlite'])
  stateEngine: StateEngine;

  @ApiPropertyOptional({ example: 'stubrix_db' })
  @IsOptional()
  @IsString()
  stateDatabase?: string;

  @ApiProperty({ example: 'SELECT * FROM users WHERE active = true' })
  @IsString()
  @IsNotEmpty()
  stateQuery: string;

  @ApiProperty({
    example: '{ "users": {{json state.rows}}, "count": {{state.rowCount}} }',
  })
  @IsString()
  @IsNotEmpty()
  stateTemplate: string;

  @ApiPropertyOptional({ example: 5000, description: 'Query timeout in ms' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  queryTimeoutMs?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Cache TTL in seconds (0 = disabled)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3600)
  cacheTtlSeconds?: number;
}

export class StatefulMockResponseDto {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Fallback body if DB query fails' })
  @IsOptional()
  @IsString()
  fallbackBody?: string;
}

export class CreateStatefulMockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => StatefulMockRequestDto)
  request: StatefulMockRequestDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => StateConfigDto)
  stateConfig: StateConfigDto;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => StatefulMockResponseDto)
  @IsOptional()
  response?: StatefulMockResponseDto;
}
