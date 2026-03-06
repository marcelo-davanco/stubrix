import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { DbSnapshotsService } from './db-snapshots.service';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { UpdateSnapshotDto } from './dto/update-snapshot.dto';
import { RestoreSnapshotDto } from './dto/restore-snapshot.dto';

@Controller('db')
export class DbSnapshotsController {
  constructor(private readonly snapshotsService: DbSnapshotsService) {}

  @Get('snapshots')
  list(@Query('projectId') projectId?: string) {
    return this.snapshotsService.list(projectId);
  }

  @Post('snapshots')
  async create(@Body() dto: CreateSnapshotDto) {
    return this.snapshotsService.create(dto);
  }

  @Post('engines/:engine/snapshots')
  async createByEngine(
    @Param('engine') engine: string,
    @Body() dto: CreateSnapshotDto,
  ) {
    return this.snapshotsService.create(dto, engine);
  }

  @Patch('snapshots/:name')
  update(@Param('name') name: string, @Body() dto: UpdateSnapshotDto) {
    return this.snapshotsService.update(name, dto);
  }

  @Delete('snapshots/:name')
  remove(@Param('name') name: string) {
    return this.snapshotsService.remove(name);
  }

  @Post('snapshots/:name/restore')
  restore(@Param('name') name: string, @Body() dto: RestoreSnapshotDto) {
    return this.snapshotsService.restore(name, dto);
  }

  @Post('engines/:engine/snapshots/:name/restore')
  restoreByEngine(
    @Param('engine') engine: string,
    @Param('name') name: string,
    @Body() dto: RestoreSnapshotDto,
  ) {
    return this.snapshotsService.restore(name, dto, engine);
  }
}
