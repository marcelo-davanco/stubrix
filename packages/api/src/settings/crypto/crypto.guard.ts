import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { CryptoService } from './crypto.service';

@Injectable()
export class CryptoSessionGuard implements CanActivate {
  constructor(private readonly crypto: CryptoService) {}

  canActivate(): boolean {
    if (!this.crypto.isSessionUnlocked()) {
      throw new ForbiddenException(
        'Encryption session not active. POST /api/settings/master-password/verify to unlock.',
      );
    }
    return true;
  }
}

// ─── Rate-limit guard ─────────────────────────────────────────

interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SHORT_MS = 5 * 60_000;
const LOCKOUT_LONG_MS = 30 * 60_000;
const LONG_LOCKOUT_THRESHOLD = 10;

@Injectable()
export class PasswordRateLimitGuard implements CanActivate {
  canActivate(context: import('@nestjs/common').ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ ip?: string }>();
    const ip = req.ip ?? 'unknown';
    const now = Date.now();

    const record = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };

    if (record.lockedUntil > now) {
      const remaining = Math.ceil((record.lockedUntil - now) / 1000);
      throw new ForbiddenException(
        `Too many failed attempts. Try again in ${remaining}s.`,
      );
    }

    // Reset window if it's been more than 1 minute since first attempt
    // (simple sliding — resets after lock clears or window expires)
    record.count += 1;

    if (record.count > LONG_LOCKOUT_THRESHOLD) {
      record.lockedUntil = now + LOCKOUT_LONG_MS;
      record.count = 0;
      attempts.set(ip, record);
      throw new ForbiddenException(
        `Too many failed attempts. Locked for 30 minutes.`,
      );
    }

    if (record.count > MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_SHORT_MS;
      attempts.set(ip, record);
      throw new ForbiddenException(
        `Too many failed attempts. Locked for 5 minutes.`,
      );
    }

    attempts.set(ip, record);

    // Clear window after 1 minute of inactivity
    setTimeout(() => {
      const current = attempts.get(ip);
      if (current && current.lockedUntil <= Date.now()) {
        attempts.delete(ip);
      }
    }, WINDOW_MS);

    return true;
  }
}

export function clearRateLimitAttempts(ip: string): void {
  attempts.delete(ip);
}
