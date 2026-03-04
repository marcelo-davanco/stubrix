import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  proxyTarget?: string | null;

  @IsOptional()
  @IsString()
  description?: string;
}
