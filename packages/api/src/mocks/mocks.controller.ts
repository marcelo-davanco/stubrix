import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MocksService } from './mocks.service';
import { CreateMockDto } from './dto/create-mock.dto';
import { UpdateMockDto } from './dto/update-mock.dto';

@ApiTags('mocks')
@Controller('projects/:projectId/mocks')
export class MocksController {
  constructor(private readonly mocksService: MocksService) {}

  @Get()
  @ApiOperation({
    summary: 'List project mocks',
    description: 'Retrieve all mocks for a specific project',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({ status: 200, description: 'Mocks retrieved successfully' })
  findAll(@Param('projectId') projectId: string) {
    return this.mocksService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get mock by ID',
    description: 'Retrieve a specific mock within a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiParam({ name: 'id', description: 'Mock identifier' })
  @ApiResponse({ status: 200, description: 'Mock retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Mock not found' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.mocksService.findOne(projectId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new mock',
    description: 'Create a new mock within a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({ status: 201, description: 'Mock created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid mock data' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateMockDto) {
    return this.mocksService.create(projectId, dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update mock',
    description: 'Update an existing mock',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiParam({ name: 'id', description: 'Mock identifier' })
  @ApiResponse({ status: 200, description: 'Mock updated successfully' })
  @ApiResponse({ status: 404, description: 'Mock not found' })
  @ApiResponse({ status: 400, description: 'Invalid mock data' })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMockDto,
  ) {
    return this.mocksService.update(projectId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete mock',
    description: 'Delete a mock from a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiParam({ name: 'id', description: 'Mock identifier' })
  @ApiResponse({ status: 204, description: 'Mock deleted successfully' })
  @ApiResponse({ status: 404, description: 'Mock not found' })
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.mocksService.remove(projectId, id);
  }
}
