import { IsOptional, IsString } from 'class-validator';

export class StartRecordingDto {
  @IsOptional()
  @IsString()
  proxyTarget?: string;
}
