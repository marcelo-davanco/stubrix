const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400 bg-green-400/10',
  POST: 'text-blue-400 bg-blue-400/10',
  PUT: 'text-yellow-400 bg-yellow-400/10',
  PATCH: 'text-orange-400 bg-orange-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
};

type MockMethodBadgeProps = {
  method: string;
};

export function MockMethodBadge({ method }: MockMethodBadgeProps) {
  const colors = METHOD_COLORS[method] ?? 'text-text-secondary bg-white/10';
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors}`}>
      {method}
    </span>
  );
}
