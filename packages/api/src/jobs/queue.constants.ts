/** BullMQ queue names */
export const QUEUE_NAMES = {
  SNAPSHOTS: 'stubrix-snapshots',
  IMPORTS: 'stubrix-imports',
  SCENARIOS: 'stubrix-scenarios',
  RECORDING: 'stubrix-recording',
  PERFORMANCE: 'stubrix-performance',
  INTELLIGENCE: 'stubrix-intelligence',
  CHAOS: 'stubrix-chaos',
  BACKUPS: 'stubrix-backups',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Default job options */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600,
    count: 200,
  },
  removeOnFail: {
    age: 86400,
    count: 500,
  },
};

/** Priority mapping (BullMQ: lower number = higher priority) */
export const PRIORITY_MAP = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
} as const;

/** Estimated durations per job type (for client hints) */
export const ESTIMATED_DURATIONS: Record<string, string> = {
  'snapshot:create': '5-30s',
  'snapshot:restore': '5-60s',
  'import:file': '2-15s',
  'import:url': '3-20s',
  'import:content': '2-10s',
  'scenario:capture': '1-5s',
  'scenario:restore': '2-10s',
  'recording:start': '1-3s',
  'recording:stop': '1-5s',
  'performance:run': '30-300s',
  'intelligence:query': '5-60s',
  'chaos:execute': '2-30s',
  'backup:create': '5-30s',
  'backup:restore': '5-60s',
};
