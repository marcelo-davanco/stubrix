import type { StatusResponse } from '@stubrix/shared';
import { StatCard } from './StatCard.js';

type EngineStatusBarProps = {
  status: StatusResponse;
};

export function EngineStatusBar({ status }: EngineStatusBarProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard label="Engine" value={status.engine} />
      <StatCard label="Status" value={status.engineStatus === 'running' ? '🟢 Online' : '🔴 Offline'} />
      <StatCard label="Total Mocks" value={String(status.mocks.total)} />
      <StatCard label="Port" value={String(status.port)} />
    </div>
  );
}
