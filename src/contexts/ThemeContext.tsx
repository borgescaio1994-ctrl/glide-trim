import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEstablishment } from '@/hooks/useEstablishment';

export type UiThemeId = 'dark_gold' | 'light_gold';

type ThemeContextValue = {
  uiTheme: UiThemeId;
  setUiThemeLocal: (t: UiThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_EVENT = 'booknow-theme-updated';

export function dispatchUiThemeUpdated(uiTheme: UiThemeId) {
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { ui_theme: uiTheme } }));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { establishment } = useEstablishment();
  const { profile } = useAuth();
  const [fromProfile, setFromProfile] = useState<UiThemeId | null>(null);
  const [localOverride, setLocalOverride] = useState<UiThemeId | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (establishment?.ui_theme) {
        setFromProfile(null);
        return;
      }
      const eid = profile?.establishment_id;
      if (!eid) {
        setFromProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from('establishments')
        .select('ui_theme')
        .eq('id', eid)
        .maybeSingle();
      if (cancelled || error) return;
      const t = (data as { ui_theme?: string } | null)?.ui_theme;
      if (t === 'light_gold' || t === 'dark_gold') setFromProfile(t);
      else setFromProfile('dark_gold');
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [establishment?.id, establishment?.ui_theme, profile?.establishment_id]);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const t = (e as CustomEvent<{ ui_theme?: UiThemeId }>).detail?.ui_theme;
      if (t === 'light_gold' || t === 'dark_gold') setLocalOverride(t);
    };
    window.addEventListener(THEME_EVENT, onUpdated);
    return () => window.removeEventListener(THEME_EVENT, onUpdated);
  }, []);

  useEffect(() => {
    setLocalOverride(null);
  }, [establishment?.id]);

  const uiTheme: UiThemeId = useMemo(() => {
    if (localOverride) return localOverride;
    const fromEst = establishment?.ui_theme;
    if (fromEst === 'light_gold' || fromEst === 'dark_gold') return fromEst;
    if (fromProfile === 'light_gold' || fromProfile === 'dark_gold') return fromProfile;
    return 'dark_gold';
  }, [establishment?.ui_theme, fromProfile, localOverride]);

  useEffect(() => {
    if (uiTheme === 'light_gold') {
      document.documentElement.setAttribute('data-theme', 'light-gold');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [uiTheme]);

  const setUiThemeLocal = useCallback((t: UiThemeId) => {
    setLocalOverride(t);
  }, []);

  const value = useMemo(
    () => ({ uiTheme, setUiThemeLocal }),
    [uiTheme, setUiThemeLocal]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useUiTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useUiTheme must be used within ThemeProvider');
  return ctx;
}
