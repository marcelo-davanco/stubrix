import { IsOptional, IsString } from 'class-validator';

export class CreateSnapshotDto {
  @IsString()
  @IsOptional()
  engine?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  database?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  connectionId?: string;
}
