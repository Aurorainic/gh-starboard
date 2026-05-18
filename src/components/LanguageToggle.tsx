import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/useLanguage";
import { LANGUAGE_LABELS, getLanguageLabel } from "@/i18n/translations";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { language, toggleLanguage, availableLanguages } = useLanguage();

  if (availableLanguages.length <= 1) return null;

  const idx = availableLanguages.indexOf(language);
  const nextLang =
    availableLanguages[(idx + 1) % availableLanguages.length];
  const label = LANGUAGE_LABELS[nextLang] || getLanguageLabel(nextLang);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
