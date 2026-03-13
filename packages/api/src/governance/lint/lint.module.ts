import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { LintController } from './lint.controller';
import { LintService } from './lint.service';

@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [LintController],
  providers: [LintService],
  exports: [LintService],
})
export class LintModule {}
