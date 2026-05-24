import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useTranslation";
import { Bot, ArrowUpDown, ChevronDown, Filter } from "lucide-react";
import { type SortKey, type Filters, MAX_STARS_FILTER } from "@/hooks/useStars";

interface CategoryCount {
  name: string;
  count: number;
  isAi: boolean;
}

interface SidebarProps {
  categories: CategoryCount[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  maxStarsValue: number;
  entryLanguages: string[];
}

export function Sidebar({
  categories,
  selectedCategories,
  onCategoriesChange,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  maxStarsValue,
  entryLanguages,
}: SidebarProps) {
  const { t } = useT();
  const [langExpanded, setLangExpanded] = useState(false);

  function catName(name: string) {
    return t(`category.${name}`) || name;
  }

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "starred", label: t("sort.starred") },
    { key: "stars", label: t("sort.stars") },
    { key: "updated", label: t("sort.updated") },
    { key: "name", label: t("sort.name") },
  ];

  const sliderMax = Math.max(maxStarsValue, 1);
  const currentMin = filters.minStars;
  const currentMax = filters.maxStars === MAX_STARS_FILTER ? sliderMax : filters.maxStars;

  const toggleLanguage = (lang: string) => {
    const next = filters.languages.includes(lang)
      ? filters.languages.filter((l) => l !== lang)
      : [...filters.languages, lang];
    onFiltersChange({ ...filters, languages: next });
  };

  const selectedCategory = selectedCategories[0] || "";

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-14 pt-4">
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <div className="px-3 py-2 space-y-5">

            {/* Categories */}
            <div>
              <h2 className="mb-2 px-2 text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {t("sidebar.toc")}
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-sm font-normal">
                    <span className="truncate">
                      {selectedCategory ? catName(selectedCategory) : t("sidebar.all")}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-96 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => onCategoriesChange([])}
                    className={cn("cursor-pointer", !selectedCategory && "bg-accent")}
                  >
                    {t("sidebar.all")}
                  </DropdownMenuItem>
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat.name}
                      onClick={() => onCategoriesChange([cat.name])}
                      className={cn("cursor-pointer", selectedCategory === cat.name && "bg-accent")}
                    >
                      <span className="flex items-center gap-2 w-full">
                        <span className="truncate flex-1">{catName(cat.name)}</span>
                        <span className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                          {cat.isAi && <Bot className="h-3 w-3" />}
                          <span>{cat.count}</span>
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Separator />

            {/* Sort */}
            <div>
              <h2 className="mb-2 px-2 text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {t("sidebar.sort")}
              </h2>
              <div className="space-y-0.5">
                {sortOptions.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onSortChange(key)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-left",
                      sortBy === key && "bg-accent font-medium"
                    )}
                  >
                    <span className={cn(
                      "h-4 w-4 rounded-full border shrink-0 inline-flex items-center justify-center",
                      sortBy === key
                        ? "border-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {sortBy === key && (
                        <span className="h-2 w-2 rounded-full bg-primary block" />
                      )}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Star range */}
            <div className="px-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{t("sidebar.stars")}</span>
                <span>
                  {currentMin.toLocaleString()} –{" "}
                  {currentMax === sliderMax && filters.maxStars === MAX_STARS_FILTER
                    ? "∞"
                    : currentMax.toLocaleString()}
                </span>
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

            <Separator />

            {/* Languages */}
            <div>
              <button
                onClick={() => setLangExpanded(!langExpanded)}
                className="flex w-full items-center justify-between px-2 mb-2 text-sm font-semibold tracking-tight hover:text-foreground transition-colors text-muted-foreground"
              >
                <span>{t("sidebar.languages")}{filters.languages.length > 0 ? ` (${filters.languages.length})` : ""}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${langExpanded ? "rotate-180" : ""}`} />
              </button>
              {langExpanded && (
                <div className="grid grid-cols-2 gap-0.5 px-2">
                  {entryLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded text-xs hover:bg-accent transition-colors text-left"
                    >
                      <span className={cn(
                        "h-3 w-3 rounded-sm border shrink-0 inline-flex items-center justify-center text-[10px]",
                        filters.languages.includes(lang) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}>
                        {filters.languages.includes(lang) ? "✓" : ""}
                      </span>
                      <span className="truncate">{lang}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </nav>
    </aside>
  );
}
