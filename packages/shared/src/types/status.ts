export type EngineType = 'wiremock' | 'mockoon';
export type EngineStatus = 'running' | 'stopped' | 'error';

export interface MocksByProject {
  [projectId: string]: number;
}

export interface MocksCount {
  total: number;
  bodyFiles: number;
  byProject: MocksByProject;
}

export interface StatusResponse {
  engine: EngineType;
  engineStatus: EngineStatus;
  port: number;
  controlPort: number;
  recordMode: boolean;
  proxyTarget: string | null;
  mocks: MocksCount;
  projects: number;
  uptime: number;
}
