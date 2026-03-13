import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportConfigDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @ApiPropertyOptional({ enum: ['json', 'yaml'] })
  @IsOptional()
  @IsEnum(['json', 'yaml'])
  format?: 'json' | 'yaml';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  encrypted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSensitive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  masterPassword?: string;
}
