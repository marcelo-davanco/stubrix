import { type ReactNode } from 'react';

type ActionBtnProps = {
  children: ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
};

export function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'p-2 rounded-md text-xs transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-400/20'
          : 'text-text-secondary hover:bg-white/10 hover:text-text-primary',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
