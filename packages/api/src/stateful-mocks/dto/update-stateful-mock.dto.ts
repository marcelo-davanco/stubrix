import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatefulMockRequestDto,
  StateConfigDto,
  StatefulMockResponseDto,
} from './create-stateful-mock.dto';

export class UpdateStatefulMockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StatefulMockRequestDto)
  request?: StatefulMockRequestDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StateConfigDto)
  stateConfig?: StateConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StatefulMockResponseDto)
  response?: StatefulMockResponseDto;
}
