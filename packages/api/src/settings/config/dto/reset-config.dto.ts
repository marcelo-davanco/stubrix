import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResetConfigDto {
  @ApiPropertyOptional({
    description:
      'Keys to reset. If omitted, resets ALL configs for the service.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keys?: string[];
}
