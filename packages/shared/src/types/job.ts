/** Job type identifiers for all async operations */
export type JobType =
  | 'snapshot:create'
  | 'snapshot:restore'
  | 'import:file'
  | 'import:url'
  | 'import:content'
  | 'import:har'
  | 'import:postman'
  | 'scenario:capture'
  | 'scenario:restore'
  | 'recording:start'
  | 'recording:stop'
  | 'performance:run'
  | 'intelligence:query'
  | 'chaos:execute'
  | 'backup:create'
  | 'backup:restore';

/** Job status lifecycle */
export type JobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Priority levels for queue ordering */
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

/** Core job representation shared across API and UI */
export interface StubrixJob<TResult = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  progress: number;
  progressMessage?: string;
  result?: TResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

/** Request to create an async job */
export interface CreateJobRequest {
  type: JobType;
  priority?: JobPriority;
  payload: Record<string, unknown>;
  webhookUrl?: string;
}

/** Immediate response when a job is accepted */
export interface JobAcceptedResponse {
  jobId: string;
  status: 'pending';
  statusUrl: string;
  streamUrl: string;
  estimatedDuration?: string;
}

/** SSE event shape for job progress streaming */
export interface JobProgressEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  message?: string;
  result?: unknown;
  error?: string;
  timestamp: string;
}

/** Webhook callback payload sent on job completion/failure */
export interface JobWebhookPayload {
  jobId: string;
  type: JobType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
  duration: number;
  completedAt: string;
}

/** Query params for listing jobs */
export interface ListJobsQuery {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

/** Paginated jobs response */
export interface ListJobsResponse {
  jobs: StubrixJob[];
  total: number;
  limit: number;
  offset: number;
}
