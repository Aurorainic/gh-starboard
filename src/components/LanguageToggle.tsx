import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useTranslation";
import { useLanguage } from "@/i18n/useLanguage";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { t } = useT();
  const { toggleLanguage } = useLanguage();

  return (
    <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">{t("language.switch")}</span>
    </Button>
  );
}
