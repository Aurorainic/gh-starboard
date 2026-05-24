import { useContext } from "react";
import { LanguageContext } from "@/i18n/context";
import { translations, DEFAULT_LANGUAGE } from "@/i18n/translations";

export function useT() {
  const { language, i18nData } = useContext(LanguageContext);

  function t(key: string, params?: Record<string, string | number>): string {
    // 3-layer fallback: i18n file > hardcoded > English > key
    const i18nText = i18nData[key];
    const langTable = translations[language] || translations[DEFAULT_LANGUAGE];
    let text = i18nText ?? langTable?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return { t, language };
}
