import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CloudService } from './cloud.service';

export class CreateBucketDto {
  @IsString()
  bucket: string;
}

export class PublishSnsDto {
  @IsString()
  topic: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  subject?: string;
}

@ApiTags('cloud')
@Controller('cloud')
export class CloudController {
  constructor(private readonly service: CloudService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Check LocalStack availability and running services',
  })
  health() {
    return this.service.health();
  }

  @Get('config')
  @ApiOperation({ summary: 'Get LocalStack/AWS configuration' })
  config() {
    return this.service.getConfig();
  }

  @Get('s3/buckets')
  @ApiOperation({ summary: 'List S3 buckets in LocalStack' })
  listBuckets() {
    return this.service.listS3Buckets();
  }

  @Post('s3/buckets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an S3 bucket in LocalStack' })
  createBucket(@Body() dto: CreateBucketDto) {
    return this.service.createS3Bucket(dto.bucket);
  }

  @Get('sqs/queues')
  @ApiOperation({ summary: 'List SQS queues in LocalStack' })
  listQueues() {
    return this.service.listSqsQueues();
  }

  @Post('sns/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a message to an SNS topic in LocalStack' })
  publishSns(@Body() dto: PublishSnsDto) {
    return this.service.publishSnsMessage(dto.topic, dto.message, dto.subject);
  }
}
