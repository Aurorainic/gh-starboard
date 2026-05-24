import { Star, LayoutList } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { type SiteConfig } from "@/types";
import { type Filters } from "@/hooks/useStars";
import { useT } from "@/i18n/useTranslation";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onHomeClick: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  totalEntries: number;
  categoriesCount: number;
  siteConfig: SiteConfig;
}

export function Header({
  searchQuery,
  onSearchChange,
  onHomeClick,
  totalEntries,
  categoriesCount,
  siteConfig,
}: HeaderProps) {
  const { t, language } = useT();

  const title = siteConfig.title?.[language] || t("app.title");
  const subtitle = siteConfig.subtitle?.[language] || t("app.subtitle");

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <button onClick={onHomeClick} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            {subtitle}
          </span>
        </button>

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 cursor-default">
            <Star className="h-3.5 w-3.5" />
            {totalEntries}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 cursor-default">
            <LayoutList className="h-3.5 w-3.5" />
            {categoriesCount}
          </span>
        </div>

        <SearchBar value={searchQuery} onChange={onSearchChange} />

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
