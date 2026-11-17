
import React, { createContext, useContext, useState } from 'react';
import { translations, Language } from '../translations';
import { safeStorage } from '../services/storageService';
import { translateUi, setUiLanguage } from '../i18n/runtime';


import { defaultBillingCurrency } from '../billing/locale';

export type Currency = 'USD' | 'GEL';
export type AppRegion = 'Georgia' | 'Global' | 'GE' | 'GLOBAL';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  region: 'Georgia' | 'Global' | 'GE' | 'GLOBAL';
  setRegion: (r: any) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (amount: number) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const GLOBAL_CONTEXT_KEY = '__AGRIMAP_LANGUAGE_CONTEXT__';
let LanguageContext: React.Context<LanguageContextType | undefined>;
if (typeof window !== 'undefined') {
  if (!(window as any)[GLOBAL_CONTEXT_KEY]) {
    (window as any)[GLOBAL_CONTEXT_KEY] = createContext<LanguageContextType | undefined>(undefined);
  }
  LanguageContext = (window as any)[GLOBAL_CONTEXT_KEY];
} else {
  LanguageContext = createContext<LanguageContextType | undefined>(undefined);
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = safeStorage.getItem('agri-app-lang');
      return (saved === 'ka' || saved === 'en') ? saved : 'en';
    } catch (e) {
      return 'en';
    }
  });

  const [region, setRegionState] = useState<'Georgia' | 'Global' | 'GE' | 'GLOBAL'>(() => {
    try {
      const saved = safeStorage.getItem('agri-app-region');
      if (saved === 'Georgia' || saved === 'GE') return 'Georgia';
      if (saved === 'Global' || saved === 'GLOBAL') return 'Global';
      return 'Georgia';
    } catch (e) {
      return 'Georgia';
    }
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const saved = safeStorage.getItem('agri-app-currency');
      if (saved === 'USD' || saved === 'GEL') return saved;
      return defaultBillingCurrency(region, language);
    } catch (e) {
      return 'USD';
    }
  });

  setUiLanguage(language);
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setUiLanguage(lang);
    setLanguageState(lang);
    safeStorage.setItem('agri-app-lang', lang);
    const automatic = defaultBillingCurrency(region, lang);
    setCurrencyState(automatic);
    safeStorage.setItem('agri-app-currency', automatic);
  };

  const setRegion = (r: any) => {
    const next = (r === 'GE' || r === 'Georgia') ? 'Georgia' : 'Global';
    setRegionState(next);
    safeStorage.setItem('agri-app-region', next);
    const automatic = defaultBillingCurrency(next, language);
    setCurrencyState(automatic);
    safeStorage.setItem('agri-app-currency', automatic);
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    safeStorage.setItem('agri-app-currency', c);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(language === 'ka' ? 'ka-GE' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    if (!key || typeof key !== 'string') return '';
    const keys = key.split('.');
    let current: any = translations[language];
    let fallbackCurrent: any = translations['en'];

    // 1) Try flat lookup
    let result = current ? current[key] : undefined;

    // 2) Try nested lookup if flat lookup didn't return a string
    if (typeof result !== 'string' && keys.length > 1) {
      let node = current;
      for (const k of keys) {
        if (node && typeof node === 'object' && node[k] !== undefined) {
          node = node[k];
        } else {
          node = undefined;
          break;
        }
      }
      if (typeof node === 'string') {
        result = node;
      }
    }

    // 3) Try 15,000+ key pure translation dictionary from i18n
    if (typeof result !== 'string' || result === key) {
      const i18nLookup = translateUi(key, language);
      if (i18nLookup && i18nLookup !== key) {
        result = i18nLookup;
      }
    }

    if (typeof result !== 'string') {
      // Fallback to English
      let fallbackResult = fallbackCurrent ? fallbackCurrent[key] : undefined;
      if (typeof fallbackResult !== 'string' && keys.length > 1) {
        let node = fallbackCurrent;
        for (const k of keys) {
          if (node && typeof node === 'object' && node[k] !== undefined) {
            node = node[k];
          } else {
            node = undefined;
            break;
          }
        }
        if (typeof node === 'string') {
          fallbackResult = node;
        }
      }
      result = typeof fallbackResult === 'string' ? fallbackResult : key;
    }

    if (typeof result !== 'string') {
      if (result && typeof result === 'object') {
        if (typeof (result as any).name === 'string') return (result as any).name;
        if (typeof (result as any).title === 'string') return (result as any).title;
        return String(key);
      }
      return String(result ?? key);
    }

    result = translateUi(result, language);

    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        result = (result as string).replace(
          new RegExp(`\\{${paramKey}\\}`, 'g'), 
          String(language === 'ka' && /^(unit|uom|role|status|currency)$/.test(paramKey) ? translateUi(paramValue, language) : paramValue)
        );
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, region, setRegion, currency, setCurrency, formatCurrency, t }}>
      {children}
    </LanguageContext.Provider>
  );
};


export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
