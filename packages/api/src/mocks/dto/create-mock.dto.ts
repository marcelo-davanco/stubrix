import {
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { MockMetadata } from '@stubrix/shared';

export class MockRequestDto {
  @IsString()
  @IsNotEmpty()
  method: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  urlPattern?: string;

  @IsOptional()
  @IsString()
  urlPath?: string;

  @IsOptional()
  @IsString()
  urlPathPattern?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;

  @IsOptional()
  bodyPatterns?: unknown[];
}

export class MockResponseDto {
  @IsNumber()
  status: number;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  bodyFileName?: string;

  @IsOptional()
  @IsNumber()
  fixedDelayMilliseconds?: number;
}

export class CreateMockDto {
  @ValidateNested()
  @Type(() => MockRequestDto)
  request: MockRequestDto;

  @ValidateNested()
  @Type(() => MockResponseDto)
  response: MockResponseDto;

  @IsOptional()
  @IsObject()
  metadata?: MockMetadata;
}
