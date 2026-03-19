import { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import type { CryptoStatus } from '../../hooks/useSettings';
import { useTranslation } from '../../lib/i18n';

interface MasterPasswordBannerProps {
  status: CryptoStatus | null;
  onSetup: (password: string) => Promise<void>;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => Promise<void>;
}

export function MasterPasswordBanner({
  status,
  onSetup,
  onUnlock,
  onLock,
}: MasterPasswordBannerProps) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState<'setup' | 'unlock'>('setup');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const openSetup = () => {
    setMode('setup');
    setPassword('');
    setConfirm('');
    setError('');
    setShowDialog(true);
  };
  const openUnlock = () => {
    setMode('unlock');
    setPassword('');
    setError('');
    setShowDialog(true);
  };
  const close = () => {
    setShowDialog(false);
    setPassword('');
    setConfirm('');
    setError('');
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'setup') {
        if (password.length < 8) {
          setError(t('settings.passwordMinLength'));
          return;
        }
        if (password !== confirm) {
          setError(t('settings.passwordsDoNotMatch'));
          return;
        }
        await onSetup(password);
        close();
      } else {
        const ok = await onUnlock(password);
        if (!ok) {
          setError(t('settings.incorrectPassword'));
          return;
        }
        close();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  let banner: React.ReactNode;

  if (!status.configured) {
    banner = (
      <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <Lock size={18} className="text-yellow-400 flex-shrink-0" />
        <div className="flex-1 text-sm">
          <span className="text-yellow-200 font-medium">
            {t('settings.masterPasswordNotConfigured')}
          </span>
          <span className="text-yellow-200/70 ml-2">
            {t('settings.sensitivePlaintext')}
          </span>
        </div>
        <button
          type="button"
          onClick={openSetup}
          className="px-3 py-1.5 text-xs rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 transition-colors"
        >
          {t('settings.setupMasterPassword')}
        </button>
      </div>
    );
  } else if (status.sessionActive) {
    const mins = Math.ceil(status.sessionExpiresIn / 60);
    banner = (
      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
        <ShieldCheck size={18} className="text-green-400 flex-shrink-0" />
        <div className="flex-1 text-sm">
          <span className="text-green-200 font-medium">
            {t('settings.encryptionActive')}
          </span>
          <span className="text-green-200/70 ml-2">
            {t('settings.sessionExpiresInMinutes', { count: mins })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void onLock()}
          className="px-3 py-1.5 text-xs rounded-lg border border-green-500/40 hover:bg-green-500/10 text-green-300 transition-colors"
        >
          {t('settings.lockNow')}
        </button>
      </div>
    );
  } else {
    banner = (
      <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <Lock size={18} className="text-blue-400 flex-shrink-0" />
        <div className="flex-1 text-sm">
          <span className="text-blue-200 font-medium">
            {t('settings.encryptionConfigured')}
          </span>
          <span className="text-blue-200/70 ml-2">
            {t('settings.sessionLocked')}
          </span>
        </div>
        <button
          type="button"
          onClick={openUnlock}
          className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 transition-colors"
        >
          {t('settings.unlock')}
        </button>
      </div>
    );
  }

  return (
    <>
      {banner}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-semibold mb-4">
              {mode === 'setup'
                ? t('settings.setupMasterPassword')
                : t('settings.unlockSession')}
            </h2>
            <div className="space-y-3">
              <input
                type="password"
                placeholder={t('settings.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
              {mode === 'setup' && (
                <input
                  type="password"
                  placeholder={t('settings.confirmPasswordPlaceholder')}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              )}
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy}
                className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {busy
                  ? t('settings.processing')
                  : mode === 'setup'
                    ? t('settings.setup')
                    : t('settings.unlock')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
