import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ContractsService } from './contracts.service';

export class CanIDeployDto {
  @IsString()
  pacticipant: string;

  @IsString()
  version: string;
}

@ApiTags('contracts')
@Controller('api/contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Pact Broker availability' })
  health() {
    return this.service.healthCheck();
  }

  @Get('pacts')
  @ApiOperation({ summary: 'List all latest pact contracts from Pact Broker' })
  list() {
    return this.service.listContracts();
  }

  @Get('can-i-deploy')
  @ApiOperation({ summary: 'Check if a pacticipant version can be deployed to production' })
  @ApiQuery({ name: 'pacticipant', required: true })
  @ApiQuery({ name: 'version', required: true })
  canIDeploy(
    @Query('pacticipant') pacticipant: string,
    @Query('version') version: string,
  ) {
    return this.service.canIDeploy(pacticipant, version);
  }
}
