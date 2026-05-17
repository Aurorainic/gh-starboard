import { useContext } from "react";
import { LanguageContext } from "@/i18n/context";
import { translations } from "@/i18n/translations";

export function useT() {
  const { language } = useContext(LanguageContext);

  function t(key: string, params?: Record<string, string | number>): string {
    let text = translations[language]?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return { t, language };
}
