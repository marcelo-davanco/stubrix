import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IamToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export interface IamUser {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  enabled: boolean;
}

@Injectable()
export class IamService {
  private readonly logger = new Logger(IamService.name);
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly zitadelUrl: string;

  constructor(private readonly config: ConfigService) {
    this.keycloakUrl = this.config.get<string>('KEYCLOAK_URL') ?? 'http://localhost:8180';
    this.realm = this.config.get<string>('KEYCLOAK_REALM') ?? 'stubrix';
    this.clientId = this.config.get<string>('KEYCLOAK_CLIENT_ID') ?? 'stubrix-api';
    this.clientSecret = this.config.get<string>('KEYCLOAK_CLIENT_SECRET') ?? '';
    this.zitadelUrl = this.config.get<string>('ZITADEL_URL') ?? 'http://localhost:8080';
  }

  async keycloakHealth(): Promise<{ available: boolean; url: string; realm: string }> {
    try {
      const res = await fetch(
        `${this.keycloakUrl}/realms/${this.realm}`,
        { signal: AbortSignal.timeout(3_000) },
      );
      return { available: res.ok, url: this.keycloakUrl, realm: this.realm };
    } catch {
      return { available: false, url: this.keycloakUrl, realm: this.realm };
    }
  }

  async zitadelHealth(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.zitadelUrl}/healthz`, {
        signal: AbortSignal.timeout(3_000),
      });
      return { available: res.ok, url: this.zitadelUrl };
    } catch {
      return { available: false, url: this.zitadelUrl };
    }
  }

  async getToken(username: string, password: string): Promise<IamToken> {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      username,
      password,
      ...(this.clientSecret ? { client_secret: this.clientSecret } : {}),
    });

    const res = await fetch(
      `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!res.ok) throw new Error(`Keycloak token request failed: HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return {
      accessToken: String(data['access_token'] ?? ''),
      tokenType: String(data['token_type'] ?? 'Bearer'),
      expiresIn: Number(data['expires_in'] ?? 300),
      scope: data['scope'] ? String(data['scope']) : undefined,
    };
  }

  async getClientCredentialsToken(): Promise<IamToken> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(
      `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!res.ok) throw new Error(`Keycloak client credentials failed: HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return {
      accessToken: String(data['access_token'] ?? ''),
      tokenType: String(data['token_type'] ?? 'Bearer'),
      expiresIn: Number(data['expires_in'] ?? 300),
    };
  }

  async introspectToken(token: string): Promise<Record<string, unknown>> {
    const body = new URLSearchParams({
      token,
      client_id: this.clientId,
      ...(this.clientSecret ? { client_secret: this.clientSecret } : {}),
    });

    const res = await fetch(
      `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!res.ok) throw new Error(`Token introspection failed: HTTP ${res.status}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  getConfig(): Record<string, unknown> {
    return {
      keycloak: {
        url: this.keycloakUrl,
        realm: this.realm,
        clientId: this.clientId,
        issuer: `${this.keycloakUrl}/realms/${this.realm}`,
      },
      zitadel: {
        url: this.zitadelUrl,
      },
    };
  }
}
