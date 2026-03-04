import { IsObject, IsOptional } from 'class-validator';

export class UpdateMockDto {
  @IsOptional()
  @IsObject()
  request?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  response?: Record<string, unknown>;
}
