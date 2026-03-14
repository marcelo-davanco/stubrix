import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
} from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigDatabaseService } from '../database/config-database.service';

const ENC_PREFIX = 'enc:v1:';

function deriveKey(password: string, salt: Buffer): Buffer {
  const iterations = parseInt(process.env.PBKDF2_ITERATIONS ?? '100000', 10);
  return pbkdf2Sync(password, salt, iterations, 32, 'sha512');
}

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private derivedKey: Buffer | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;

  private get SESSION_DURATION(): number {
    return parseInt(process.env.CRYPTO_SESSION_TIMEOUT ?? '1800000', 10);
  }

  private get BCRYPT_ROUNDS(): number {
    return parseInt(process.env.CRYPTO_BCRYPT_ROUNDS ?? '12', 10);
  }

  constructor(private readonly configDb: ConfigDatabaseService) {}

  // ─── Master password management ───────────────────────────────

  async setupMasterPassword(password: string): Promise<void> {
    if (this.isMasterPasswordConfigured()) {
      throw new ForbiddenException(
        'Master password already configured. Use /change to update it.',
      );
    }

    const salt = randomBytes(32);
    const hash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    this.configDb.setMasterKey(hash, salt);

    this.derivedKey = deriveKey(password, salt);
    this.startSessionTimer();

    // Encrypt any existing plaintext sensitive values
    this.encryptExistingPlaintext();

    this.logger.log('Master password configured. Encryption session started.');
  }

  async verifyMasterPassword(password: string): Promise<boolean> {
    const masterKey = this.configDb.getMasterKey();
    if (!masterKey) return false;

    const valid = await bcrypt.compare(password, masterKey.password_hash);
    if (!valid) return false;

    const salt = Buffer.isBuffer(masterKey.salt)
      ? masterKey.salt
      : Buffer.from(masterKey.salt as unknown as ArrayBuffer);

    this.derivedKey = deriveKey(password, salt);
    this.startSessionTimer();

    this.logger.log('Master password verified. Encryption session unlocked.');
    return true;
  }

  async changeMasterPassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<number> {
    const masterKey = this.configDb.getMasterKey();
    if (!masterKey) {
      throw new ForbiddenException(
        'No master password configured. Use /setup first.',
      );
    }

    const valid = await bcrypt.compare(oldPassword, masterKey.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Old password is incorrect.');
    }

    const oldSalt = Buffer.isBuffer(masterKey.salt)
      ? masterKey.salt
      : Buffer.from(masterKey.salt as unknown as ArrayBuffer);

    const oldKey = deriveKey(oldPassword, oldSalt);
    const newSalt = randomBytes(32);
    const newKey = deriveKey(newPassword, newSalt);
    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    const reEncrypted = this.reEncryptAll(oldKey, newKey);

    this.configDb.updateMasterKey(newHash, newSalt);

    this.derivedKey = newKey;
    this.startSessionTimer();

    this.logger.log(
      `Master password changed. Re-encrypted ${reEncrypted} sensitive values.`,
    );
    return reEncrypted;
  }

  isMasterPasswordConfigured(): boolean {
    return this.configDb.getMasterKey() !== undefined;
  }

  isSessionUnlocked(): boolean {
    return this.derivedKey !== null;
  }

  // ─── Encryption / Decryption ──────────────────────────────────

  encrypt(plaintext: string): string {
    if (!this.derivedKey) {
      throw new ForbiddenException(
        'Encryption session not active. Verify master password first.',
      );
    }

    this.resetSessionTimer();

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.derivedKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${ENC_PREFIX}${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  decrypt(ciphertext: string): string {
    if (!this.derivedKey) {
      throw new ForbiddenException(
        'Encryption session not active. Verify master password first.',
      );
    }

    if (!this.isEncrypted(ciphertext)) {
      return ciphertext;
    }

    this.resetSessionTimer();

    const parts = ciphertext.split(':');
    // Format: enc:v1:{iv}:{ciphertext}:{authTag}
    const ivHex = parts[2];
    const encryptedHex = parts[3];
    const authTagHex = parts[4];

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.derivedKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(ENC_PREFIX);
  }

  // ─── Bulk re-encryption ───────────────────────────────────────

  reEncryptAll(oldKey: Buffer, newKey: Buffer): number {
    const services = this.configDb.getAllServices();
    let count = 0;

    for (const svc of services) {
      const configs = this.configDb.getServiceConfigs(svc.id);
      for (const cfg of configs) {
        if (cfg.is_sensitive !== 1) continue;

        let plaintext: string;
        if (this.isEncrypted(cfg.value)) {
          plaintext = this.decryptWithKey(cfg.value, oldKey);
        } else {
          plaintext = cfg.value;
        }

        const newEncrypted = this.encryptWithKey(plaintext, newKey);
        const checksum = this.computeChecksum(plaintext);

        this.configDb.setConfig(svc.id, cfg.key, newEncrypted, {
          is_sensitive: 1,
          description: cfg.description,
          data_type: cfg.data_type,
          checksum,
        });

        count++;
      }
    }

    return count;
  }

  // ─── Session management ───────────────────────────────────────

  lockSession(): void {
    this.derivedKey = null;
    this.clearSessionTimer();
    this.logger.log('Encryption session manually locked.');
  }

  getSessionTimeRemaining(): number {
    if (!this.derivedKey || !this.sessionTimeout) return 0;
    // We track the deadline separately for accurate reporting
    const elapsed = Date.now() - this.sessionStart;
    return Math.max(0, this.SESSION_DURATION - elapsed);
  }

  // ─── Checksum ─────────────────────────────────────────────────

  computeChecksum(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  verifyChecksum(value: string, checksum: string): boolean {
    return this.computeChecksum(value) === checksum;
  }

  // ─── Private helpers ──────────────────────────────────────────

  private sessionStart = 0;

  private startSessionTimer(): void {
    this.clearSessionTimer();
    this.sessionStart = Date.now();
    this.sessionTimeout = setTimeout(() => {
      this.derivedKey = null;
      this.sessionTimeout = null;
      this.logger.log('Encryption session expired — key cleared from memory.');
    }, this.SESSION_DURATION);
  }

  private resetSessionTimer(): void {
    if (this.derivedKey) {
      this.startSessionTimer();
    }
  }

  private clearSessionTimer(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  private encryptWithKey(plaintext: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${ENC_PREFIX}${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  private decryptWithKey(ciphertext: string, key: Buffer): string {
    const parts = ciphertext.split(':');
    const ivHex = parts[2];
    const encryptedHex = parts[3];
    const authTagHex = parts[4];

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private encryptExistingPlaintext(): void {
    if (!this.derivedKey) return;
    const services = this.configDb.getAllServices();
    let count = 0;

    for (const svc of services) {
      const configs = this.configDb.getServiceConfigs(svc.id);
      for (const cfg of configs) {
        if (cfg.is_sensitive !== 1 || this.isEncrypted(cfg.value)) continue;

        const encrypted = this.encryptWithKey(cfg.value, this.derivedKey);
        const checksum = this.computeChecksum(cfg.value);

        this.configDb.setConfig(svc.id, cfg.key, encrypted, {
          is_sensitive: 1,
          description: cfg.description,
          data_type: cfg.data_type,
          checksum,
        });
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(
        `Encrypted ${count} existing plaintext sensitive value(s).`,
      );
    }
  }
}
