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
import { MocksService } from './mocks.service';
import { CreateMockDto } from './dto/create-mock.dto';
import { UpdateMockDto } from './dto/update-mock.dto';

@Controller('projects/:projectId/mocks')
export class MocksController {
  constructor(private readonly mocksService: MocksService) {}

  @Get()
  findAll(@Param('projectId') projectId: string) {
    return this.mocksService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.mocksService.findOne(projectId, id);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateMockDto) {
    return this.mocksService.create(projectId, dto);
  }

  @Put(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMockDto,
  ) {
    return this.mocksService.update(projectId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.mocksService.remove(projectId, id);
  }
}
