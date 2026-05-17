import { FileQuestion } from "lucide-react";
import { useT } from "@/i18n/useTranslation";

export function EmptyState() {
  const { t } = useT();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold">{t("empty.title")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("empty.description")}
      </p>
    </div>
  );
}
