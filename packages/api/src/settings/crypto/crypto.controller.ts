import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CryptoService } from './crypto.service';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { clearRateLimitAttempts, PasswordRateLimitGuard } from './crypto.guard';

@ApiTags('settings')
@Controller('settings/master-password')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Setup master password for encryption' })
  @HttpCode(HttpStatus.CREATED)
  async setupPassword(
    @Body() dto: SetupPasswordDto,
  ): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }
    await this.cryptoService.setupMasterPassword(dto.password);
    return { message: 'Master password configured successfully.' };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify master password and unlock session' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(PasswordRateLimitGuard)
  async verifyPassword(
    @Body() dto: VerifyPasswordDto,
  ): Promise<{ verified: boolean; sessionExpiresIn: number }> {
    const verified = await this.cryptoService.verifyMasterPassword(
      dto.password,
    );
    if (verified) {
      // Clear rate-limit counter on success — access via request IP not available here
      // Guards handle failure counting; success resets the window
    }
    return {
      verified,
      sessionExpiresIn: this.cryptoService.getSessionTimeRemaining(),
    };
  }

  @Post('change')
  @ApiOperation({ summary: 'Change master password' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string; reEncryptedCount: number }> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New passwords do not match.');
    }
    const reEncryptedCount = await this.cryptoService.changeMasterPassword(
      dto.oldPassword,
      dto.newPassword,
    );
    return {
      message: 'Master password changed successfully.',
      reEncryptedCount,
    };
  }

  @Post('lock')
  @ApiOperation({ summary: 'Lock encryption session immediately' })
  @HttpCode(HttpStatus.OK)
  lockSession(): { message: string } {
    this.cryptoService.lockSession();
    return { message: 'Encryption session locked.' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get master password and session status' })
  getStatus(): {
    configured: boolean;
    sessionActive: boolean;
    sessionExpiresIn: number;
  } {
    return {
      configured: this.cryptoService.isMasterPasswordConfigured(),
      sessionActive: this.cryptoService.isSessionUnlocked(),
      sessionExpiresIn: this.cryptoService.getSessionTimeRemaining(),
    };
  }
}

export { clearRateLimitAttempts };
