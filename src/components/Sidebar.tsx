import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useTranslation";

interface SidebarProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryClick: (category: string) => void;
}

export function Sidebar({
  categories,
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
                    "w-full justify-start text-sm font-normal",
                    activeCategory === cat &&
                      "bg-accent text-accent-foreground font-medium"
                  )}
                  onClick={() => onCategoryClick(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </nav>
    </aside>
  );
}
