export type FaultType =
  | 'delay'
  | 'error'
  | 'timeout'
  | 'random_error'
  | 'bandwidth_limit';

export interface FaultProfile {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  urlPattern?: string;
  methods?: string[];
  faults: FaultRule[];
  createdAt: string;
}

export interface FaultRule {
  type: FaultType;
  probability: number;
  delayMs?: number;
  errorStatus?: number;
  errorMessage?: string;
  bandwidthKbps?: number;
}

export interface ChaosPreset {
  name: string;
  description: string;
  faults: FaultRule[];
}

export interface ChaosResult {
  triggered: boolean;
  fault?: FaultRule;
  profile?: string;
}
