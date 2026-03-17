import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScenarioBundle,
  ScenarioMeta,
  ScenarioDiff,
  ScenarioConfig,
} from './scenario.types';

@Injectable()
export class ScenariosService {
  private readonly logger = new Logger(ScenariosService.name);
  private readonly scenariosDir: string;
  private readonly mappingsDir: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
    this.scenariosDir = path.join(mocksDir, 'scenarios');
    fs.mkdirSync(this.scenariosDir, { recursive: true });
  }

  listScenarios(): ScenarioMeta[] {
    return fs
      .readdirSync(this.scenariosDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          const raw = fs.readFileSync(path.join(this.scenariosDir, f), 'utf-8');
          const bundle = JSON.parse(raw) as ScenarioBundle;
          return bundle.meta;
        } catch {
          return null;
        }
      })
      .filter((m): m is ScenarioMeta => m !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getScenario(id: string): ScenarioBundle {
    const filePath = this.resolveFile(id);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Scenario not found: ${id}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ScenarioBundle;
  }

  capture(
    name: string,
    description?: string,
    tags?: string[],
    config: ScenarioConfig = {},
  ): ScenarioBundle {
    const mocks = this.captureMocks();
    const id = uuidv4();
    const meta: ScenarioMeta = {
      id,
      name,
      description,
      createdAt: new Date().toISOString(),
      tags,
      config,
    };

    const bundle: ScenarioBundle = { meta, mocks };
    const slug = name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 30);
    const filename = path.basename(`${slug}_${id}.json`);
    // codeql[js/http-to-file-access] - intentional: captured mock scenario bundle is persisted to local storage
    fs.writeFileSync(
      path.join(this.scenariosDir, filename),
      JSON.stringify(bundle, null, 2),
    );

    this.logger.log(
      `Scenario captured: ${name} (${id}) — ${mocks.length} mocks`,
    );
    return bundle;
  }

  restore(id: string): { restored: number; name: string } {
    const bundle = this.getScenario(id);
    fs.mkdirSync(this.mappingsDir, { recursive: true });

    const existing = fs.existsSync(this.mappingsDir)
      ? fs.readdirSync(this.mappingsDir).filter((f) => f.endsWith('.json'))
      : [];
    for (const f of existing) {
      fs.unlinkSync(path.join(this.mappingsDir, f));
    }

    for (const mock of bundle.mocks) {
      const mockId = (mock as { id?: string }).id ?? uuidv4();
      const filename = path.basename(
        `scenario_${bundle.meta.id}_${mockId}.json`,
      );
      fs.writeFileSync(
        path.join(this.mappingsDir, filename),
        JSON.stringify(mock, null, 2),
      );
    }

    this.logger.log(
      `Scenario restored: ${bundle.meta.name} — ${bundle.mocks.length} mocks`,
    );
    return { restored: bundle.mocks.length, name: bundle.meta.name };
  }

  deleteScenario(id: string): void {
    const filePath = this.resolveFile(id);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Scenario not found: ${id}`);
    }
    fs.unlinkSync(filePath);
    this.logger.log(`Scenario deleted: ${id}`);
  }

  diff(idA: string, idB: string): ScenarioDiff {
    const a = this.getScenario(idA);
    const b = this.getScenario(idB);

    const getMockKeys = (bundle: ScenarioBundle): Map<string, string> => {
      const map = new Map<string, string>();
      for (const mock of bundle.mocks) {
        const m = mock as {
          request?: { method?: string; urlPath?: string; url?: string };
        };
        const key = `${m.request?.method}:${m.request?.urlPath ?? m.request?.url}`;
        map.set(key, JSON.stringify(mock));
      }
      return map;
    };

    const aMap = getMockKeys(a);
    const bMap = getMockKeys(b);

    const added = [...bMap.keys()].filter((k) => !aMap.has(k));
    const removed = [...aMap.keys()].filter((k) => !bMap.has(k));
    const modified = [...aMap.keys()].filter(
      (k) => bMap.has(k) && aMap.get(k) !== bMap.get(k),
    );

    const parts: string[] = [];
    if (added.length) parts.push(`+${added.length} mocks`);
    if (removed.length) parts.push(`-${removed.length} mocks`);
    if (modified.length) parts.push(`~${modified.length} modified`);

    return {
      scenarioA: a.meta.name,
      scenarioB: b.meta.name,
      addedMocks: added,
      removedMocks: removed,
      modifiedMocks: modified,
      dbChanged: Boolean(a.meta.config.dbEngine || b.meta.config.dbEngine),
      summary: parts.length ? parts.join(', ') : 'No differences',
    };
  }

  private captureMocks(): Record<string, unknown>[] {
    if (!fs.existsSync(this.mappingsDir)) return [];
    return fs
      .readdirSync(this.mappingsDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          const raw = fs.readFileSync(path.join(this.mappingsDir, f), 'utf-8');
          return [JSON.parse(raw) as Record<string, unknown>];
        } catch {
          return [];
        }
      });
  }

  private resolveFile(id: string): string {
    const files = fs.existsSync(this.scenariosDir)
      ? fs.readdirSync(this.scenariosDir).filter((f) => f.endsWith('.json'))
      : [];

    const match = files.find((f) => {
      try {
        const raw = fs.readFileSync(path.join(this.scenariosDir, f), 'utf-8');
        const b = JSON.parse(raw) as ScenarioBundle;
        return b.meta.id === id;
      } catch {
        return false;
      }
    });

    return match
      ? path.join(this.scenariosDir, match)
      : path.join(this.scenariosDir, `${path.basename(id)}.json`);
  }
}
