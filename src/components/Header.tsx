import { useState } from "react";
import { Star, LayoutList, ArrowUpDown, SlidersHorizontal, ChevronDown } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { type SiteConfig } from "@/types";
import { type SortKey, type Filters, MAX_STARS_FILTER } from "@/hooks/useStars";
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
  maxStarsValue: number;
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
  maxStarsValue,
  totalEntries,
  categoriesCount,
  siteConfig,
}: HeaderProps) {
  const { t, language } = useT();
  const [langExpanded, setLangExpanded] = useState(false);

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
    (filters.minStars > 0 || filters.maxStars < MAX_STARS_FILTER ? 1 : 0);

  const toggleLanguage = (lang: string) => {
    const next = filters.languages.includes(lang)
      ? filters.languages.filter((l) => l !== lang)
      : [...filters.languages, lang];
    onFiltersChange({ ...filters, languages: next });
  };

  const sliderMax = Math.max(maxStarsValue, 1);
  const currentMin = filters.minStars;
  const currentMax = filters.maxStars === MAX_STARS_FILTER ? sliderMax : filters.maxStars;

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
          <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
            {/* Star range slider at top */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{t("sort.stars")}</span>
                <span>{currentMin.toLocaleString()} – {currentMax === sliderMax && filters.maxStars === MAX_STARS_FILTER ? "∞" : currentMax.toLocaleString()}</span>
              </div>
              <Slider
                min={0}
                max={sliderMax}
                step={Math.max(1, Math.floor(sliderMax / 100))}
                value={[currentMin, currentMax]}
                onValueChange={([min, max]) => {
                  onFiltersChange({
                    ...filters,
                    minStars: min,
                    maxStars: max >= sliderMax ? MAX_STARS_FILTER : max,
                  });
                }}
                className="w-full"
              />
            </div>

            <DropdownMenuSeparator />

            {/* Languages — collapsible, multi-column */}
            <div>
              <button
                onClick={() => setLangExpanded(!langExpanded)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t("entry.language")}{filters.languages.length > 0 ? ` (${filters.languages.length})` : ""}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${langExpanded ? "rotate-180" : ""}`} />
              </button>
              {langExpanded && (
                <div className="grid grid-cols-2 gap-0.5 px-2 pb-2">
                  {entryLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded text-xs hover:bg-accent transition-colors text-left"
                    >
                      <span className={`h-3 w-3 rounded-sm border shrink-0 inline-flex items-center justify-center text-[10px] ${filters.languages.includes(lang) ? "bg-primary text-primary-foreground" : ""}`}>
                        {filters.languages.includes(lang) ? "✓" : ""}
                      </span>
                      <span className="truncate">{lang}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
