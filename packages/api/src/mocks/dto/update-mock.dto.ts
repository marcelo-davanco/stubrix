import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MockRequestDto, MockResponseDto } from './create-mock.dto';

export class UpdateMockDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => MockRequestDto)
  request?: MockRequestDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MockResponseDto)
  response?: MockResponseDto;
}
