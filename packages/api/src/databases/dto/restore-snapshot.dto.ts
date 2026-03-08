import { IsOptional, IsString } from 'class-validator';

export class RestoreSnapshotDto {
  @IsString()
  @IsOptional()
  database?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  connectionId?: string;
}
