import { Star, LayoutList, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { type SiteConfig } from "@/types";
import { type SortKey, type Filters } from "@/hooks/useStars";
import { useT } from "@/i18n/useTranslation";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onHomeClick: () => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  entryLanguages: string[];
  totalEntries: number;
  categoriesCount: number;
  siteConfig: SiteConfig;
}

export function Header({
  searchQuery,
  onSearchChange,
  onHomeClick,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  entryLanguages,
  totalEntries,
  categoriesCount,
  siteConfig,
}: HeaderProps) {
  const { t, language } = useT();

  const title = siteConfig.title?.[language] || t("app.title");
  const subtitle = siteConfig.subtitle?.[language] || t("app.subtitle");

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "starred", label: t("sort.starred") },
    { key: "stars", label: t("sort.stars") },
    { key: "updated", label: t("sort.updated") },
    { key: "name", label: t("sort.name") },
  ];

  const activeFilterCount =
    (filters.languages.length > 0 ? 1 : 0) +
    (filters.minStars > 0 || filters.maxStars < Infinity ? 1 : 0);

  const toggleLanguage = (lang: string) => {
    const next = filters.languages.includes(lang)
      ? filters.languages.filter((l) => l !== lang)
      : [...filters.languages, lang];
    onFiltersChange({ ...filters, languages: next });
  };

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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-default">
                <Star className="h-3.5 w-3.5" />
                {totalEntries}
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("stats.totalStars", { count: totalEntries })}</TooltipContent>
          </Tooltip>
          <span>·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-default">
                <LayoutList className="h-3.5 w-3.5" />
                {categoriesCount}
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("stats.categories", { count: categoriesCount })}</TooltipContent>
          </Tooltip>
        </div>

        <SearchBar value={searchQuery} onChange={onSearchChange} />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {sortOptions.map(({ key, label }) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onSortChange(key)}
                className={sortBy === key ? "bg-accent" : ""}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter */}
        {entryLanguages.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t("entry.language")}</DropdownMenuLabel>
              {entryLanguages.map((lang) => (
                <DropdownMenuItem key={lang} onClick={() => toggleLanguage(lang)}>
                  <span className={`mr-2 h-3.5 w-3.5 rounded-sm border inline-flex items-center justify-center text-xs ${filters.languages.includes(lang) ? "bg-primary text-primary-foreground" : ""}`}>
                    {filters.languages.includes(lang) ? "✓" : ""}
                  </span>
                  {lang}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("sort.stars")}</DropdownMenuLabel>
              <div className="px-2 py-1.5 flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder={t("filter.min")}
                  defaultValue={filters.minStars > 0 ? filters.minStars : ""}
                  onBlur={(e) => {
                    const min = Math.max(0, parseInt(e.target.value, 10) || 0);
                    onFiltersChange({ ...filters, minStars: min });
                  }}
                  className="w-16 h-7 rounded border bg-transparent text-center text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="number"
                  placeholder={t("filter.max")}
                  defaultValue={filters.maxStars < Infinity ? filters.maxStars : ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const max = raw === "" ? Infinity : Math.max(0, parseInt(raw, 10) || 0);
                    onFiltersChange({ ...filters, maxStars: max });
                  }}
                  className="w-16 h-7 rounded border bg-transparent text-center text-xs"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
