import { type ReactNode } from 'react';

type EmptyStateProps = {
  message: string;
  action?: ReactNode;
};

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-text-secondary">
      <p>{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
