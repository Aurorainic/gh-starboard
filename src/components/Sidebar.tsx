import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useTranslation";
import { Bot } from "lucide-react";

interface SidebarProps {
  categories: string[];
  aiCategories: string[];
  activeCategory: string | null;
  onCategoryClick: (category: string) => void;
}

export function Sidebar({
  categories,
  aiCategories,
  activeCategory,
  onCategoryClick,
}: SidebarProps) {
  const { t } = useT();

  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <nav className="sticky top-14 pt-4">
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
              {t("sidebar.toc")}
            </h2>
            <div className="space-y-1">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-sm font-normal gap-1.5",
                    activeCategory === cat &&
                      "bg-accent text-accent-foreground font-medium"
                  )}
                  onClick={() => onCategoryClick(cat)}
                >
                  <span className="truncate">{cat}</span>
                  {aiCategories.includes(cat) && (
                    <Bot className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </nav>
    </aside>
  );
}
