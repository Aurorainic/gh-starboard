import { Star, LayoutList, ArrowUpDown } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { type SiteConfig } from "@/types";
import { type SortKey } from "@/hooks/useStars";
import { useT } from "@/i18n/useTranslation";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  totalEntries: number;
  categoriesCount: number;
  siteConfig: SiteConfig;
}

export function Header({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
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
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
