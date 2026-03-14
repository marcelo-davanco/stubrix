import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

interface HttpRequest {
  ip?: string;
  connection?: { remoteAddress?: string };
}

@Injectable()
export class PasswordRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, AttemptRecord>();

  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 60_000;
  private readonly LOCKOUT_SHORT_MS = 300_000;
  private readonly LOCKOUT_LONG_MS = 1_800_000;
  private readonly LONG_LOCKOUT_THRESHOLD = 10;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const ip = request.ip ?? request.connection?.remoteAddress ?? 'unknown';
    const now = Date.now();

    const record = this.attempts.get(ip);

    if (record?.lockedUntil && now < record.lockedUntil) {
      const remaining = Math.ceil((record.lockedUntil - now) / 1000);
      throw new HttpException(
        `Too many attempts. Try again in ${remaining} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (record && now - record.firstAttempt > this.WINDOW_MS) {
      this.attempts.delete(ip);
      this.attempts.set(ip, { count: 1, firstAttempt: now });
      return true;
    }

    if (record && record.count >= this.MAX_ATTEMPTS) {
      const lockoutMs =
        record.count >= this.LONG_LOCKOUT_THRESHOLD
          ? this.LOCKOUT_LONG_MS
          : this.LOCKOUT_SHORT_MS;
      record.lockedUntil = now + lockoutMs;
      throw new HttpException(
        `Too many attempts. Locked for ${lockoutMs / 60_000} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!record) {
      this.attempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      record.count++;
    }

    return true;
  }

  resetAttempts(ip: string): void {
    this.attempts.delete(ip);
  }
}
