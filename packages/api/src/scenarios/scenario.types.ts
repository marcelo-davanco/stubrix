export interface ScenarioConfig {
  mocksDir?: string;
  dbEngine?: string;
  dbName?: string;
  env?: Record<string, string>;
}

export interface ScenarioMeta {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  tags?: string[];
  config: ScenarioConfig;
}

export interface ScenarioBundle {
  meta: ScenarioMeta;
  mocks: Record<string, unknown>[];
  dbSnapshot?: string;
}

export interface ScenarioDiff {
  scenarioA: string;
  scenarioB: string;
  addedMocks: string[];
  removedMocks: string[];
  modifiedMocks: string[];
  dbChanged: boolean;
  summary: string;
}
