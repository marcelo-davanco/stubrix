import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertProjectDatabaseDto {
  @IsString()
  @IsIn(['postgres', 'mysql', 'sqlite', 'mongodb'])
  engine!: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  database?: string;

  @IsString()
  @IsOptional()
  host?: string;

  @IsString()
  @IsOptional()
  port?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
