import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface SensitiveFieldProps {
  value: string;
  sessionActive: boolean;
  onChange: (value: string) => void;
  onRequestUnlock: () => void;
  disabled?: boolean;
}

export function SensitiveField({
  value,
  sessionActive,
  onChange,
  onRequestUnlock,
  disabled,
}: SensitiveFieldProps) {
  const [revealed, setRevealed] = useState(false);

  if (!sessionActive) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="password"
          value="••••••••"
          readOnly
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm opacity-60 cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onRequestUnlock}
          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
        >
          <Lock size={12} />
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <input
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="absolute right-2.5 text-text-secondary hover:text-text-primary transition-colors"
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
