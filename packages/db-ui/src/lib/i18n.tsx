import { createContext, useContext, type ReactNode } from 'react';

export type TDbUiTranslate = (key: string) => string;

const DbUiI18nContext = createContext<TDbUiTranslate | null>(null);

export function DbUiI18nProvider({
  t,
  children,
}: {
  t: TDbUiTranslate;
  children: ReactNode;
}) {
  return (
    <DbUiI18nContext.Provider value={t}>{children}</DbUiI18nContext.Provider>
  );
}

export function useDbUiTranslation(): TDbUiTranslate {
  const t = useContext(DbUiI18nContext);
  return t ?? ((key: string) => key);
}
