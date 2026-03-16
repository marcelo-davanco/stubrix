import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CoverageController } from './coverage.controller';
import { CoverageService } from './coverage.service';

@Module({
  imports: [MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } })],
  controllers: [CoverageController],
  providers: [CoverageService],
  exports: [CoverageService],
})
export class CoverageModule {}
