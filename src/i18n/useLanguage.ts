import { useContext } from "react";
import { LanguageContext } from "@/i18n/context";

export function useLanguage() {
  return useContext(LanguageContext);
}
