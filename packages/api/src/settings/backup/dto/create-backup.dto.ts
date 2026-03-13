import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBackupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  encrypted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  masterPassword?: string;
}
