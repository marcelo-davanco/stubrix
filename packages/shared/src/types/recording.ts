export interface RecordingState {
  active: boolean;
  projectId: string | null;
  proxyTarget: string | null;
  startedAt: string | null;
  requestsRecorded: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface StartRecordingDto {
  proxyTarget?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface RecordingStopResult {
  message: string;
  projectId: string;
  newMocks: number;
  files: string[];
}

export interface SnapshotResult {
  message: string;
  projectId: string;
  newMocks: number;
}
