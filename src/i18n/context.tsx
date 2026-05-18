import { createContext, useState, useCallback, type ReactNode } from "react";
import { DEFAULT_LANGUAGE } from "@/i18n/translations";

export interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  toggleLanguage: () => void;
  availableLanguages: string[];
  setAvailableLanguages: (langs: string[]) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  toggleLanguage: () => {},
  availableLanguages: [DEFAULT_LANGUAGE],
  setAvailableLanguages: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([
    DEFAULT_LANGUAGE,
  ]);
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const idx = availableLanguages.indexOf(prev);
      const nextIdx = (idx + 1) % availableLanguages.length;
      return availableLanguages[nextIdx];
    });
  }, [availableLanguages]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        availableLanguages,
        setAvailableLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
