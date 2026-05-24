import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { DEFAULT_LANGUAGE } from "@/i18n/translations";

const STORAGE_KEY = "language";

function safeGetStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* blocked */ }
}

function detectBrowserLanguage(): string {
  const nav = navigator.language;
  if (nav) return nav;
  if (navigator.languages?.length) return navigator.languages[0];
  return DEFAULT_LANGUAGE;
}

const LANG_VARIANTS: Record<string, string[]> = {
  "zh-Hans": ["zh-CN"],
  "zh-Hant": ["zh-TW", "zh-HK"],
  "pt-BR": ["pt"],
  "es-ES": ["es"],
  "en-US": ["en"],
  "en-GB": ["en"],
};

function matchBrowserLanguage(available: string[]): string | null {
  const browser = detectBrowserLanguage();
  if (available.includes(browser)) return browser;

  // Check variant mapping (e.g. zh-Hans → zh-CN)
  const variants = LANG_VARIANTS[browser];
  if (variants) {
    for (const variant of variants) {
      if (available.includes(variant)) return variant;
    }
  }

  // Check prefix fallback (e.g. fr-CA → fr)
  const prefix = browser.split("-")[0];
  if (available.includes(prefix)) return prefix;

  return null;
}

export interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  availableLanguages: string[];
  setAvailableLanguages: (langs: string[]) => void;
  uiTranslations: Record<string, Record<string, string>>;
  setUITranslations: (t: Record<string, Record<string, string>>) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  availableLanguages: [DEFAULT_LANGUAGE],
  setAvailableLanguages: () => {},
  uiTranslations: {},
  setUITranslations: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([
    DEFAULT_LANGUAGE,
  ]);
  const [uiTranslations, setUITranslations] = useState<Record<string, Record<string, string>>>({});
  const [language, setLanguageState] = useState<string>(() => {
    const saved = safeGetStorage(STORAGE_KEY);
    if (saved) return saved;
    return detectBrowserLanguage();
  });

  // Only persist after user explicitly sets language or data validates it
  const userChoseRef = useRef(!!safeGetStorage(STORAGE_KEY));

  useEffect(() => {
    if (userChoseRef.current) {
      safeSetStorage(STORAGE_KEY,language);
    }
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    userChoseRef.current = true;
    setLanguageState(lang);
  }, []);

  const handleSetAvailableLanguages = useCallback(
    (langs: string[]) => {
      setAvailableLanguages(langs);

      if (!userChoseRef.current) {
        // No explicit user choice yet — try browser language match
        const matched = matchBrowserLanguage(langs);
        if (matched) {
          setLanguageState(matched);
          safeSetStorage(STORAGE_KEY,matched);
          userChoseRef.current = true;
        }
      }
    },
    []
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        availableLanguages,
        setAvailableLanguages: handleSetAvailableLanguages,
        uiTranslations,
        setUITranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
