import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/i18n/useTranslation";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalStars: number;
  categoriesCount: number;
}

export function Header({
  searchQuery,
  onSearchChange,
  totalStars,
  categoriesCount,
}: HeaderProps) {
  const { t } = useT();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold truncate">{t("app.title")}</h1>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            {t("app.subtitle")}
          </span>
        </div>

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("stats.totalStars", { count: totalStars })}</span>
          <span>·</span>
          <span>{t("stats.categories", { count: categoriesCount })}</span>
        </div>

        <SearchBar value={searchQuery} onChange={onSearchChange} />
        <LanguageToggle />
      </div>
    </header>
  );
}
