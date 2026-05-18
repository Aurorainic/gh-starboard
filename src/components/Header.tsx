import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/i18n/useTranslation";
import { useLanguage } from "@/i18n/useLanguage";
import { type SiteConfig } from "@/types";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalEntries: number;
  categoriesCount: number;
  siteConfig: SiteConfig;
}

export function Header({
  searchQuery,
  onSearchChange,
  totalEntries,
  categoriesCount,
  siteConfig,
}: HeaderProps) {
  const { t } = useT();
  const { language } = useLanguage();

  const title = siteConfig.title?.[language] || t("app.title");
  const subtitle = siteConfig.subtitle?.[language] || t("app.subtitle");

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            {subtitle}
          </span>
        </div>

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("stats.totalStars", { count: totalEntries })}</span>
          <span>·</span>
          <span>{t("stats.categories", { count: categoriesCount })}</span>
        </div>

        <SearchBar value={searchQuery} onChange={onSearchChange} />
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}
