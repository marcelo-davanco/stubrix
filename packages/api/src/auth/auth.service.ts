import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  workspaceId: string;
  apiKey?: string;
  createdAt: string;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  ip?: string;
  timestamp: string;
  success: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly storageDir: string;
  private readonly usersFile: string;
  private readonly auditFile: string;
  private readonly masterKey: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'auth');
    this.usersFile = path.join(this.storageDir, 'users.json');
    this.auditFile = path.join(this.storageDir, 'audit.json');
    this.masterKey =
      this.config.get<string>('AUTH_MASTER_KEY') ?? 'stubrix-dev-key';
    fs.mkdirSync(this.storageDir, { recursive: true });
    this.ensureDefaultAdmin();
  }

  listUsers(workspaceId?: string): User[] {
    const users = this.loadUsers();
    return workspaceId
      ? users.filter((u) => u.workspaceId === workspaceId)
      : users;
  }

  createUser(
    username: string,
    email: string,
    role: UserRole,
    workspaceId: string,
  ): User {
    const users = this.loadUsers();
    if (users.find((u) => u.username === username)) {
      throw new Error(`User already exists: ${username}`);
    }
    const user: User = {
      id: uuidv4(),
      username,
      email,
      role,
      workspaceId,
      apiKey: this.generateApiKey(),
      createdAt: new Date().toISOString(),
      active: true,
    };
    users.push(user);
    this.saveUsers(users);
    this.logger.log(
      `User created: ${username} (${role}) in workspace ${workspaceId}`,
    );
    return user;
  }

  rotateApiKey(userId: string): User {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    user.apiKey = this.generateApiKey();
    this.saveUsers(users);
    return user;
  }

  deactivateUser(userId: string): User {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    user.active = false;
    this.saveUsers(users);
    return user;
  }

  validateApiKey(apiKey: string): User | null {
    const user = this.loadUsers().find((u) => u.apiKey === apiKey && u.active);
    return user ?? null;
  }

  hasPermission(user: User, action: 'read' | 'write' | 'admin'): boolean {
    if (user.role === 'admin') return true;
    if (action === 'read') return true;
    if (action === 'write') return user.role === 'editor';
    return false;
  }

  audit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    const entries = this.loadAudit();
    entries.unshift(auditEntry);
    fs.writeFileSync(
      this.auditFile,
      JSON.stringify(entries.slice(0, 1000), null, 2),
    );
  }

  listAudit(userId?: string, limit = 100): AuditEntry[] {
    let entries = this.loadAudit();
    if (userId) entries = entries.filter((e) => e.userId === userId);
    return entries.slice(0, limit);
  }

  listWorkspaces(): string[] {
    const users = this.loadUsers();
    return [...new Set(users.map((u) => u.workspaceId))];
  }

  private generateApiKey(): string {
    return 'sbx_' + crypto.randomBytes(24).toString('hex');
  }

  private ensureDefaultAdmin(): void {
    if (!fs.existsSync(this.usersFile)) {
      const admin: User = {
        id: uuidv4(),
        username: 'admin',
        email: 'admin@stubrix.local',
        role: 'admin',
        workspaceId: 'default',
        apiKey:
          this.masterKey !== 'stubrix-dev-key'
            ? this.generateApiKey()
            : 'sbx_dev_default_admin_key',
        createdAt: new Date().toISOString(),
        active: true,
      };
      fs.writeFileSync(this.usersFile, JSON.stringify([admin], null, 2));
    }
  }

  private loadUsers(): User[] {
    if (!fs.existsSync(this.usersFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.usersFile, 'utf-8')) as User[];
    } catch {
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
  }

  private loadAudit(): AuditEntry[] {
    if (!fs.existsSync(this.auditFile)) return [];
    try {
      return JSON.parse(
        fs.readFileSync(this.auditFile, 'utf-8'),
      ) as AuditEntry[];
    } catch {
      return [];
    }
  }
}
