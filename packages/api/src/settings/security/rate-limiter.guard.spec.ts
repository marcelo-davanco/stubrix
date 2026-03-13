import { ExecutionContext } from '@nestjs/common';
import { PasswordRateLimitGuard } from './rate-limiter.guard';

function mockContext(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
    }),
  } as unknown as ExecutionContext;
}

describe('PasswordRateLimitGuard', () => {
  let guard: PasswordRateLimitGuard;

  beforeEach(() => {
    guard = new PasswordRateLimitGuard();
  });

  it('should allow first attempt', () => {
    expect(guard.canActivate(mockContext('1.2.3.4'))).toBe(true);
  });

  it('should allow up to MAX_ATTEMPTS without blocking', () => {
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(mockContext('10.0.0.1'))).toBe(true);
    }
  });

  it('should block after exceeding MAX_ATTEMPTS', () => {
    for (let i = 0; i < 5; i++) {
      guard.canActivate(mockContext('10.0.0.2'));
    }
    expect(() => guard.canActivate(mockContext('10.0.0.2'))).toThrow();
  });

  it('should not block different IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      guard.canActivate(mockContext('10.0.0.3'));
    }
    expect(guard.canActivate(mockContext('10.0.0.4'))).toBe(true);
  });

  it('should reset attempts after calling resetAttempts', () => {
    for (let i = 0; i < 5; i++) {
      guard.canActivate(mockContext('10.0.0.5'));
    }
    guard.resetAttempts('10.0.0.5');
    expect(guard.canActivate(mockContext('10.0.0.5'))).toBe(true);
  });
});
