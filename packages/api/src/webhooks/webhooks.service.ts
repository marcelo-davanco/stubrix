import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface WebhookEvent {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  receivedAt: string;
  signature?: string;
  verified?: boolean;
}

export interface WebhookSimulation {
  id: string;
  name: string;
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  payload: unknown;
  scheduleMs?: number;
  createdAt: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly storageDir: string;
  private readonly eventsFile: string;
  private readonly simsFile: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'webhooks');
    fs.mkdirSync(this.storageDir, { recursive: true });
    this.eventsFile = path.join(this.storageDir, 'events.json');
    this.simsFile = path.join(this.storageDir, 'simulations.json');
  }

  receiveWebhook(
    endpoint: string,
    method: string,
    headers: Record<string, string>,
    body: unknown,
    secret?: string,
  ): WebhookEvent {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const signature =
      headers['x-hub-signature-256'] ?? headers['x-signature'] ?? '';
    let verified = false;

    if (secret && signature) {
      const expected =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(raw).digest('hex');
      verified = expected === signature;
    }

    const event: WebhookEvent = {
      id: uuidv4(),
      endpoint,
      method,
      headers,
      body,
      receivedAt: new Date().toISOString(),
      signature: signature || undefined,
      verified,
    };

    const events = this.loadEvents();
    events.unshift(event);
    // codeql[js/http-to-file-access] - intentional: received webhook events are stored for replay
    fs.writeFileSync(
      this.eventsFile,
      JSON.stringify(events.slice(0, 500), null, 2),
    );
    this.logger.log(
      `Webhook received: ${method} ${endpoint} (verified: ${verified})`,
    );
    return event;
  }

  listEvents(limit = 50, endpoint?: string): WebhookEvent[] {
    let events = this.loadEvents();
    if (endpoint) events = events.filter((e) => e.endpoint === endpoint);
    return events.slice(0, limit);
  }

  getEvent(id: string): WebhookEvent | undefined {
    return this.loadEvents().find((e) => e.id === id);
  }

  clearEvents(): void {
    fs.writeFileSync(this.eventsFile, '[]');
  }

  private assertHttpUrl(url: string): string {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`URL scheme not allowed: ${parsed.protocol}`);
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      throw new Error(`URL hostname not allowed: ${hostname}`);
    }
    return parsed.href;
  }

  async replayEvent(
    id: string,
    targetUrl?: string,
  ): Promise<{ status: number; ok: boolean }> {
    const event = this.getEvent(id);
    if (!event) throw new Error(`Event not found: ${id}`);

    const url = targetUrl ?? event.endpoint;
    const safeUrl = this.assertHttpUrl(url);
    try {
      const safeMethod = String(event.method ?? 'GET');
      const safeHeaders = Object.fromEntries(
        Object.entries(event.headers ?? {}).map(([k, v]) => [
          String(k),
          String(v),
        ]),
      );
      // codeql[js/request-forgery] - assertHttpUrl() blocks private/loopback addresses
      // codeql[js/file-access-to-http] - intentional: stored event body is replayed to validated external URL
      const res = await fetch(safeUrl, {
        method: safeMethod,
        headers: safeHeaders,
        body: safeMethod !== 'GET' ? JSON.stringify(event.body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      return { status: res.status, ok: res.ok };
    } catch (err) {
      throw new Error(`Replay failed: ${(err as Error).message}`);
    }
  }

  createSimulation(
    name: string,
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    payload: unknown,
    scheduleMs?: number,
  ): WebhookSimulation {
    const sim: WebhookSimulation = {
      id: uuidv4(),
      name,
      targetUrl,
      method,
      headers,
      payload,
      scheduleMs,
      createdAt: new Date().toISOString(),
    };
    const sims = this.loadSimulations();
    sims.push(sim);
    fs.writeFileSync(this.simsFile, JSON.stringify(sims, null, 2));
    return sim;
  }

  listSimulations(): WebhookSimulation[] {
    return this.loadSimulations();
  }

  async fireSimulation(id: string): Promise<{ status: number; ok: boolean }> {
    const sim = this.loadSimulations().find((s) => s.id === id);
    if (!sim) throw new Error(`Simulation not found: ${id}`);

    const safeUrl = this.assertHttpUrl(sim.targetUrl);
    const safeMethod = String(sim.method ?? 'GET');
    const safeHeaders = Object.fromEntries(
      Object.entries(sim.headers ?? {}).map(([k, v]) => [String(k), String(v)]),
    );
    // codeql[js/request-forgery] - assertHttpUrl() blocks private/loopback addresses
    // codeql[js/file-access-to-http] - intentional: simulation payload is sent to validated external URL
    const res = await fetch(safeUrl, {
      method: safeMethod,
      headers: { 'Content-Type': 'application/json', ...safeHeaders },
      body: safeMethod !== 'GET' ? JSON.stringify(sim.payload) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    return { status: res.status, ok: res.ok };
  }

  private loadEvents(): WebhookEvent[] {
    if (!fs.existsSync(this.eventsFile)) return [];
    try {
      return JSON.parse(
        fs.readFileSync(this.eventsFile, 'utf-8'),
      ) as WebhookEvent[];
    } catch {
      return [];
    }
  }

  private loadSimulations(): WebhookSimulation[] {
    if (!fs.existsSync(this.simsFile)) return [];
    try {
      return JSON.parse(
        fs.readFileSync(this.simsFile, 'utf-8'),
      ) as WebhookSimulation[];
    } catch {
      return [];
    }
  }
}
