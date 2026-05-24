import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useTranslation";
import { Bot, ArrowUpDown } from "lucide-react";
import { type SortKey, type Filters, MAX_STARS_FILTER } from "@/hooks/useStars";

interface CategoryCount {
  name: string;
  count: number;
  isAi: boolean;
}

interface SidebarProps {
  categories: CategoryCount[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryTranslations: Record<string, Record<string, string>>;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  maxStarsValue: number;
}

export function Sidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryTranslations,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  maxStarsValue,
}: SidebarProps) {
  const { t, language } = useT();

  function catName(name: string) {
    return categoryTranslations[language]?.[name] ?? name;
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

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-14 pt-4">
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <div className="px-3 py-2 space-y-5">

            {/* Categories */}
            <div>
              <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
                {t("sidebar.toc")}
              </h2>
              <div className="space-y-0.5">
                {/* All */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-between text-sm font-normal",
                    selectedCategory === "" &&
                      "bg-accent text-accent-foreground font-medium"
                  )}
                  onClick={() => onCategoryChange("")}
                >
                  <span>{t("sidebar.all")}</span>
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.name}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-between text-sm font-normal gap-1.5",
                      selectedCategory === cat.name &&
                        "bg-accent text-accent-foreground font-medium"
                    )}
                    onClick={() => onCategoryChange(cat.name)}
                  >
                    <span className="truncate">{catName(cat.name)}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {cat.isAi && <Bot className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">{cat.count}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sort */}
            <div>
              <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort
              </h2>
              <div className="space-y-0.5">
                {sortOptions.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm font-normal",
                      sortBy === key && "bg-accent text-accent-foreground font-medium"
                    )}
                    onClick={() => onSortChange(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Star range */}
            <div className="px-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Stars</span>
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

          </div>
        </ScrollArea>
      </nav>
    </aside>
  );
}
