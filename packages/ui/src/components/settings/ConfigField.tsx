import { RotateCcw } from 'lucide-react';
import type {
  ConfigField as ConfigFieldType,
  EffectiveConfigValue,
} from '../../hooks/useServiceConfig';
import { useTranslation } from '../../lib/i18n';
import { SensitiveField } from './SensitiveField';
import { EffectiveConfigBadge } from './EffectiveConfigBadge';

interface ConfigFieldProps {
  field: ConfigFieldType;
  value: string;
  effective?: EffectiveConfigValue;
  onChange: (value: string) => void;
  onReset?: () => void;
  onRequestUnlock?: () => void;
  sessionActive?: boolean;
  error?: string;
}

function validateField(field: ConfigFieldType, value: string): string | null {
  if (field.required && !value) return `${field.label} is required`;
  if (field.dataType === 'number') {
    const num = Number(value);
    if (isNaN(num)) return `${field.label} must be a number`;
    if (field.validation?.min !== undefined && num < field.validation.min)
      return `${field.label} must be at least ${field.validation.min}`;
    if (field.validation?.max !== undefined && num > field.validation.max)
      return `${field.label} must be at most ${field.validation.max}`;
  }
  if (
    field.validation?.pattern &&
    !new RegExp(field.validation.pattern).test(value)
  )
    return `${field.label} format is invalid`;
  return null;
}

export function ConfigField({
  field,
  value,
  effective,
  onChange,
  onReset,
  onRequestUnlock,
  sessionActive = false,
  error: externalError,
}: ConfigFieldProps) {
  const { t } = useTranslation();
  const isEnvOverride = effective?.source === 'env';
  const validationError = validateField(field, value);
  const displayError = externalError ?? (value !== '' ? validationError : null);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const renderInput = () => {
    if (field.sensitive) {
      return (
        <SensitiveField
          value={value}
          sessionActive={sessionActive}
          onChange={onChange}
          onRequestUnlock={onRequestUnlock ?? (() => {})}
          disabled={isEnvOverride}
        />
      );
    }

    if (field.dataType === 'boolean') {
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => onChange(value === 'true' ? 'false' : 'true')}
            disabled={isEnvOverride}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              value === 'true' ? 'bg-primary' : 'bg-white/20'
            } ${isEnvOverride ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                value === 'true' ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm">
            {value === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      );
    }

    if (field.dataType === 'select' && field.validation?.options) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isEnvOverride}
          className={inputClass + ' appearance-none'}
        >
          {field.validation.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (field.dataType === 'json') {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isEnvOverride}
          rows={4}
          className={inputClass + ' font-mono text-xs resize-y'}
        />
      );
    }

    return (
      <input
        type={field.dataType === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isEnvOverride}
        min={field.validation?.min}
        max={field.validation?.max}
        className={inputClass}
      />
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-primary">
            {field.label}
          </label>
          {effective && <EffectiveConfigBadge source={effective.source} />}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title={t('serviceConfig.resetToDefault')}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {renderInput()}

      {isEnvOverride && (
        <p className="text-xs text-purple-400/80">
          Overridden by env var. Remove the environment variable to configure
          from the UI.
        </p>
      )}

      {field.description && !isEnvOverride && (
        <p className="text-xs text-text-secondary">{field.description}</p>
      )}

      {field.validation?.min !== undefined &&
        field.validation?.max !== undefined &&
        !isEnvOverride && (
          <p className="text-xs text-text-secondary">
            Range: {field.validation.min}–{field.validation.max}
          </p>
        )}

      {displayError && <p className="text-xs text-red-400">{displayError}</p>}
    </div>
  );
}
