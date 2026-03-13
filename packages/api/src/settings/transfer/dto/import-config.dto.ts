import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportConfigDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @ApiProperty({ enum: ['skip', 'overwrite', 'merge'] })
  @IsEnum(['skip', 'overwrite', 'merge'])
  conflictStrategy: 'skip' | 'overwrite' | 'merge';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createAutoBackup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  masterPassword?: string;
}
