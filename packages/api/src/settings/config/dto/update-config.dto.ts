import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfigUpdateItem {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class UpdateConfigDto {
  @ApiProperty({ type: [ConfigUpdateItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigUpdateItem)
  configs: ConfigUpdateItem[];
}
