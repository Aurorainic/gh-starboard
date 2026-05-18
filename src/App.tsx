import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CategorySection } from "@/components/CategorySection";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useStars } from "@/hooks/useStars";
import { useLanguage } from "@/i18n/useLanguage";

export default function App() {
  const { language } = useLanguage();
  const {
    loading,
    searchQuery,
    setSearchQuery,
    groupedByCategory,
    categories,
    totalEntries,
    siteConfig,
  } = useStars(language);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryEntries = categories.map((cat) => ({
    category: cat,
    entries: groupedByCategory[cat] ?? [],
  }));

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = entry.target.id.replace("category-", "");
            setActiveCategory(cat);
          }
        }
      },
      { rootMargin: "-60px 0px -80% 0px" }
    );

    const sections = document.querySelectorAll("[id^='category-']");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  const handleCategoryClick = useCallback((cat: string) => {
    const el = document.getElementById(`category-${cat}`);
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const hasResults = categoryEntries.length > 0;

  return (
    <div className="min-h-screen">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalEntries={totalEntries}
        categoriesCount={categories.length}
        siteConfig={siteConfig}
      />

      <div className="flex">
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />

        <main className="flex-1 min-w-0 px-4 py-6 lg:px-8">
          {/* Mobile category bar */}
          <div className="flex lg:hidden flex-wrap gap-1.5 mb-6">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => handleCategoryClick(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {!hasResults && <EmptyState />}

          <div className="space-y-10">
            {categoryEntries.map(({ category, entries }) => (
              <CategorySection
                key={category}
                category={category}
                entries={entries}
                language={language}
                onTopicClick={(topic) => setSearchQuery(`topic:${topic}`)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
