import { IsOptional, IsString } from 'class-validator';

export class RestoreSnapshotDto {
  @IsString()
  @IsOptional()
  database?: string;
}
