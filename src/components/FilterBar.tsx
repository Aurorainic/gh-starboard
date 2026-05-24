import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, X } from "lucide-react";
import { type Filters } from "@/hooks/useStars";

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories: string[];
  languages: string[];
}

export function FilterBar({ filters, onFiltersChange, categories, languages }: FilterBarProps) {
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.languages.length > 0 ? 1 : 0) +
    (filters.minStars > 0 || filters.maxStars < Infinity ? 1 : 0);

  const toggleLanguage = (lang: string) => {
    const next = filters.languages.includes(lang)
      ? filters.languages.filter((l) => l !== lang)
      : [...filters.languages, lang];
    onFiltersChange({ ...filters, languages: next });
  };

  const applyStarRange = () => {
    const min = Math.max(0, parseInt(minInput, 10) || 0);
    const max = maxInput.trim() === "" ? Infinity : Math.max(min, parseInt(maxInput, 10) || 0);
    onFiltersChange({ ...filters, minStars: min, maxStars: max });
  };

  const clearAll = () => {
    onFiltersChange({ languages: [], minStars: 0, maxStars: Infinity, category: "" });
    setMinInput("");
    setMaxInput("");
  };

  const hasStarRange = filters.minStars > 0 || filters.maxStars < Infinity;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Category</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, category: "" })} className={filters.category === "" ? "bg-accent" : ""}>
            All
          </DropdownMenuItem>
          {categories.map((cat) => (
            <DropdownMenuItem key={cat} onClick={() => onFiltersChange({ ...filters, category: cat })} className={filters.category === cat ? "bg-accent" : ""}>
              {cat}
            </DropdownMenuItem>
          ))}

          {languages.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Languages</DropdownMenuLabel>
              {languages.map((lang) => (
                <DropdownMenuItem key={lang} onClick={() => toggleLanguage(lang)}>
                  <span className={`mr-2 h-3.5 w-3.5 rounded-sm border inline-flex items-center justify-center text-xs ${filters.languages.includes(lang) ? "bg-primary text-primary-foreground" : ""}`}>
                    {filters.languages.includes(lang) ? "✓" : ""}
                  </span>
                  {lang}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Stars</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onBlur={applyStarRange}
              onKeyDown={(e) => e.key === "Enter" && applyStarRange()}
              className="w-16 h-7 rounded border bg-transparent text-center text-xs"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={applyStarRange}
              onKeyDown={(e) => e.key === "Enter" && applyStarRange()}
              className="w-16 h-7 rounded border bg-transparent text-center text-xs"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filter badges */}
      {filters.category && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, category: "" })}>
          {filters.category}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {filters.languages.map((lang) => (
        <Badge key={lang} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleLanguage(lang)}>
          {lang}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      {hasStarRange && (
        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => onFiltersChange({ ...filters, minStars: 0, maxStars: Infinity })}>
          {filters.minStars > 0 ? `≥${filters.minStars}` : ""}
          {filters.minStars > 0 && filters.maxStars < Infinity ? " & " : ""}
          {filters.maxStars < Infinity ? `≤${filters.maxStars}` : ""}
          {" stars"}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {activeCount > 0 && (
        <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Clear all
        </button>
      )}
    </div>
  );
}
