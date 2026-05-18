import { useContext } from "react";
import { LanguageContext } from "@/i18n/context";
import { translations, DEFAULT_LANGUAGE } from "@/i18n/translations";

export function useT() {
  const { language } = useContext(LanguageContext);

  function t(key: string, params?: Record<string, string | number>): string {
    const langTable = translations[language] || translations[DEFAULT_LANGUAGE];
    let text = langTable?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return { t, language };
}
