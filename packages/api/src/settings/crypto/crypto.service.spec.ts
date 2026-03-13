import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { existsSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { CryptoService } from './crypto.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-crypto');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-crypto.db');

function cleanupTestDb() {
  try {
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
    if (existsSync(TEST_DB_PATH + '-wal')) unlinkSync(TEST_DB_PATH + '-wal');
    if (existsSync(TEST_DB_PATH + '-shm')) unlinkSync(TEST_DB_PATH + '-shm');
    if (existsSync(TEST_DB_DIR)) rmSync(TEST_DB_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

describe('CryptoService', () => {
  let service: CryptoService;
  let configDb: ConfigDatabaseService;
  let module: TestingModule;

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;
    process.env.CRYPTO_BCRYPT_ROUNDS = '4'; // fast rounds for tests

    module = await Test.createTestingModule({
      providers: [ConfigDatabaseService, ServiceRegistryService, CryptoService],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    service = module.get<CryptoService>(CryptoService);

    await module.init();
  });

  afterEach(async () => {
    service.lockSession();
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
    delete process.env.CRYPTO_BCRYPT_ROUNDS;
  });

  // ─── Master password setup ────────────────────────────────────

  it('should setup master password and unlock session', async () => {
    expect(service.isMasterPasswordConfigured()).toBe(false);
    expect(service.isSessionUnlocked()).toBe(false);

    await service.setupMasterPassword('StrongPass1');

    expect(service.isMasterPasswordConfigured()).toBe(true);
    expect(service.isSessionUnlocked()).toBe(true);
  });

  it('should store bcrypt hash, not plaintext password', async () => {
    await service.setupMasterPassword('StrongPass1');

    const stored = configDb.getMasterKey();
    expect(stored).toBeDefined();
    expect(stored!.password_hash).not.toBe('StrongPass1');
    expect(stored!.password_hash).toMatch(/^\$2/); // bcrypt prefix
    expect(stored!.salt).toBeDefined();
  });

  it('should reject double setup', async () => {
    await service.setupMasterPassword('StrongPass1');
    await expect(service.setupMasterPassword('AnotherPass2')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ─── Verify password ──────────────────────────────────────────

  it('should verify correct password and unlock session', async () => {
    await service.setupMasterPassword('StrongPass1');
    service.lockSession();
    expect(service.isSessionUnlocked()).toBe(false);

    const result = await service.verifyMasterPassword('StrongPass1');

    expect(result).toBe(true);
    expect(service.isSessionUnlocked()).toBe(true);
  });

  it('should return false for wrong password', async () => {
    await service.setupMasterPassword('StrongPass1');
    service.lockSession();

    const result = await service.verifyMasterPassword('WrongPass99');

    expect(result).toBe(false);
    expect(service.isSessionUnlocked()).toBe(false);
  });

  it('should return false when no password configured', async () => {
    const result = await service.verifyMasterPassword('anything');
    expect(result).toBe(false);
  });

  // ─── Encrypt / Decrypt ────────────────────────────────────────

  it('should encrypt and decrypt a value correctly', async () => {
    await service.setupMasterPassword('StrongPass1');

    const plaintext = 'super-secret-password';
    const ciphertext = service.encrypt(plaintext);

    expect(service.isEncrypted(ciphertext)).toBe(true);
    expect(ciphertext).toMatch(/^enc:v1:/);

    const decrypted = service.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same plaintext (random IV)', async () => {
    await service.setupMasterPassword('StrongPass1');

    const c1 = service.encrypt('hello');
    const c2 = service.encrypt('hello');

    expect(c1).not.toBe(c2);
    expect(service.decrypt(c1)).toBe('hello');
    expect(service.decrypt(c2)).toBe('hello');
  });

  it('should detect tampered ciphertext (auth tag mismatch)', async () => {
    await service.setupMasterPassword('StrongPass1');

    const ciphertext = service.encrypt('tamper-me');
    const parts = ciphertext.split(':');
    // Corrupt the auth tag
    parts[4] = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' + parts[4].slice(38);
    const tampered = parts.join(':');

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('should throw when session is not active (encrypt)', () => {
    expect(() => service.encrypt('value')).toThrow(ForbiddenException);
  });

  it('should throw when session is not active (decrypt)', () => {
    expect(() => service.decrypt('enc:v1:aabb:ccdd:eeff')).toThrow(
      ForbiddenException,
    );
  });

  it('should pass through non-encrypted values in decrypt', async () => {
    await service.setupMasterPassword('StrongPass1');

    const plain = 'not-encrypted-value';
    expect(service.decrypt(plain)).toBe(plain);
  });

  // ─── Session management ───────────────────────────────────────

  it('should lock session manually', async () => {
    await service.setupMasterPassword('StrongPass1');
    expect(service.isSessionUnlocked()).toBe(true);

    service.lockSession();

    expect(service.isSessionUnlocked()).toBe(false);
    expect(service.getSessionTimeRemaining()).toBe(0);
  });

  it('should auto-expire session after timeout', async () => {
    process.env.CRYPTO_SESSION_TIMEOUT = '50'; // 50ms for test

    await service.setupMasterPassword('StrongPass1');
    expect(service.isSessionUnlocked()).toBe(true);

    await new Promise((r) => setTimeout(r, 100));

    expect(service.isSessionUnlocked()).toBe(false);

    delete process.env.CRYPTO_SESSION_TIMEOUT;
  }, 1000);

  // ─── Password change + re-encryption ─────────────────────────

  it('should re-encrypt all sensitive values on password change', async () => {
    await service.setupMasterPassword('StrongPass1');

    // Set a sensitive config
    configDb.setConfig('postgres', 'PG_PASSWORD', 'mysecret', {
      is_sensitive: 1,
      data_type: 'string',
    });
    const encrypted = service.encrypt('mysecret');
    configDb.setConfig('postgres', 'PG_PASSWORD', encrypted, {
      is_sensitive: 1,
      data_type: 'string',
      checksum: service.computeChecksum('mysecret'),
    });

    const reEncrypted = await service.changeMasterPassword(
      'StrongPass1',
      'NewStrongPass2',
    );

    expect(reEncrypted).toBeGreaterThanOrEqual(1);
    expect(service.isSessionUnlocked()).toBe(true);

    // Should still decrypt correctly with new session
    const row = configDb.getConfig('postgres', 'PG_PASSWORD');
    expect(row!.value).toMatch(/^enc:v1:/);
    expect(service.decrypt(row!.value)).toBe('mysecret');
  });

  it('should reject password change with wrong old password', async () => {
    await service.setupMasterPassword('StrongPass1');

    await expect(
      service.changeMasterPassword('WrongOldPass', 'NewStrongPass2'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject password change when no password configured', async () => {
    await expect(
      service.changeMasterPassword('anything', 'NewStrongPass2'),
    ).rejects.toThrow(ForbiddenException);
  });

  // ─── Checksum ─────────────────────────────────────────────────

  it('should compute and verify checksums', () => {
    const value = 'test-value';
    const expected = createHash('sha256').update(value).digest('hex');

    expect(service.computeChecksum(value)).toBe(expected);
    expect(service.verifyChecksum(value, expected)).toBe(true);
    expect(service.verifyChecksum(value, 'wrong')).toBe(false);
  });

  // ─── Encrypt existing plaintext on setup ─────────────────────

  it('should encrypt existing plaintext values on first setup', async () => {
    // Seed a plaintext sensitive value before setup
    configDb.setConfig('postgres', 'PG_PASSWORD', 'plaintextpass', {
      is_sensitive: 1,
      data_type: 'string',
    });

    await service.setupMasterPassword('StrongPass1');

    const row = configDb.getConfig('postgres', 'PG_PASSWORD');
    expect(row!.value).toMatch(/^enc:v1:/);
    expect(service.decrypt(row!.value)).toBe('plaintextpass');
  });
});
