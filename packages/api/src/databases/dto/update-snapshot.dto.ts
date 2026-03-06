import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateSnapshotDto {
  @IsString()
  @IsOptional()
  newName?: string;

  @IsBoolean()
  @IsOptional()
  favorite?: boolean;

  @IsBoolean()
  @IsOptional()
  protected?: boolean;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  engine?: string;
}
