import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EnableServiceDto {
  @ApiPropertyOptional({
    description: 'Auto-enable required dependencies',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableDependencies?: boolean = true;

  @ApiPropertyOptional({
    description: "Don't wait for healthy status after start",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipHealthCheck?: boolean = false;

  @ApiPropertyOptional({ description: 'Max wait time in ms', default: 60000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  timeout?: number = 60000;
}

export class DisableServiceDto {
  @ApiPropertyOptional({
    description: 'Disable even if dependents are enabled',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;

  @ApiPropertyOptional({
    description: 'Also disable services that depend on this one',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  disableDependents?: boolean = false;
}
