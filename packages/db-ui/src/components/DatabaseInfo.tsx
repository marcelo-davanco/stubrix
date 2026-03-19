import { HardDrive, Table2 } from 'lucide-react';
import type { DatabaseInfo as DatabaseInfoType } from '@stubrix/shared';

type DatabaseInfoProps = {
  info: null | DatabaseInfoType;
};

export function DatabaseInfo({ info }: DatabaseInfoProps) {
  if (!info) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-2 text-base">
            🐘
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {info.database}
            </p>
            <p className="text-xs capitalize text-text-secondary">
              {info.engine}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-1.5">
          <HardDrive size={12} className="text-text-secondary" />
          <span className="text-xs font-semibold text-text-primary">
            {info.totalSize}
          </span>
        </div>
      </div>

      {info.tables.length === 0 ? (
        <p className="text-xs text-text-secondary">
          Nenhuma tabela encontrada.
        </p>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Table2 size={12} className="text-text-secondary" />
            <p className="text-xs font-medium text-text-secondary">
              {info.tables.length} tabelas
            </p>
          </div>
          <div className="space-y-1">
            {info.tables.map((table) => (
              <div
                key={table.name}
                className="flex items-center justify-between rounded-lg bg-main-bg px-3 py-2"
              >
                <span className="font-mono text-xs text-text-primary">
                  {table.name}
                </span>
                <span className="text-xs text-text-secondary">
                  {table.size}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
