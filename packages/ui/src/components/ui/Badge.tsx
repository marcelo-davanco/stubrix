import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'accent';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variant === 'default' && 'bg-white/10 text-text-secondary',
        variant === 'success' && 'bg-success/20 text-green-400',
        variant === 'danger' && 'bg-danger/20 text-red-400',
        variant === 'warning' && 'bg-warning/20 text-yellow-400',
        variant === 'accent' && 'bg-accent/20 text-purple-400',
        className,
      )}
    >
      {children}
    </span>
  );
}
