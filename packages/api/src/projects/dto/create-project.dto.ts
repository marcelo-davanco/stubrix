import { IsString, IsOptional, IsUrl, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  proxyTarget?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
