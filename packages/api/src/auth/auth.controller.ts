import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import type { UserRole } from './auth.service';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  role: UserRole;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class ValidateKeyDto {
  @IsString()
  apiKey: string;
}

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (optionally filtered by workspace)' })
  @ApiQuery({ name: 'workspaceId', required: false })
  listUsers(@Query('workspaceId') workspaceId?: string) {
    return this.service.listUsers(workspaceId).map((u) => ({ ...u, apiKey: undefined }));
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user with role and workspace assignment' })
  createUser(@Body() dto: CreateUserDto) {
    const user = this.service.createUser(
      dto.username,
      dto.email,
      dto.role,
      dto.workspaceId ?? 'default',
    );
    return { ...user, apiKey: undefined };
  }

  @Post('users/:id/rotate-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate API key for a user' })
  rotateKey(@Param('id') id: string) {
    return this.service.rotateApiKey(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a user' })
  deactivate(@Param('id') id: string): void {
    this.service.deactivateUser(id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate an API key and return user info' })
  validate(@Body() dto: ValidateKeyDto) {
    const user = this.service.validateApiKey(dto.apiKey);
    if (!user) return { valid: false };
    return { valid: true, user: { ...user, apiKey: undefined } };
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List all workspace IDs' })
  listWorkspaces() {
    return this.service.listWorkspaces();
  }

  @Get('audit')
  @ApiOperation({ summary: 'List audit log entries' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  audit(@Query('userId') userId?: string, @Query('limit') limit?: string) {
    return this.service.listAudit(userId, limit ? parseInt(limit) : 100);
  }
}
