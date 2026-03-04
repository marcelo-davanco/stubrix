import { IsObject, IsOptional } from 'class-validator';

export class CreateMockDto {
  @IsObject()
  request: Record<string, unknown>;

  @IsObject()
  response: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
