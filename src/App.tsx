import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CategorySection } from "@/components/CategorySection";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { useStars } from "@/hooks/useStars";
import { useLanguage } from "@/i18n/useLanguage";

export default function App() {
  const { language, setLanguage, setAvailableLanguages } = useLanguage();
  const {
    loading,
    searchQuery,
    setSearchQuery,
    categories,
    groupedByCategory,
    paginatedCategories,
    page,
    totalPages,
    perPage,
    setPage,
    setPerPage,
    totalEntries,
    siteConfig,
    availableLanguages,
  } = useStars(language);

  // Sync available languages from data into context
  useEffect(() => {
    if (availableLanguages.length > 0) {
      setAvailableLanguages(availableLanguages);
    }
  }, [availableLanguages, setAvailableLanguages]);

  // Correct language if current is not in available list
  useEffect(() => {
    if (
      availableLanguages.length > 0 &&
      !availableLanguages.includes(language)
    ) {
      setLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, language, setLanguage]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
  }, [paginatedCategories]);

  const handleCategoryClick = useCallback(
    (cat: string) => {
      const el = document.getElementById(`category-${cat}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
      // Category not on current page — find which page it's on and navigate
      let offset = 0;
      for (const c of categories) {
        if (c === cat) break;
        // Count entries in this category from groupedByCategory
        offset += (groupedByCategory[c] ?? []).length;
      }
      const targetPage = Math.floor(offset / perPage) + 1;
      if (targetPage !== page) {
        setPage(targetPage);
        // Scroll after render
        requestAnimationFrame(() => {
          setTimeout(() => {
            document
              .getElementById(`category-${cat}`)
              ?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        });
      }
    },
    [categories, groupedByCategory, perPage, page, setPage]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const hasResults = paginatedCategories.length > 0;

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
            {paginatedCategories.map(({ category, entries }) => (
              <CategorySection
                key={category}
                category={category}
                entries={entries}
                language={language}
                onTopicClick={(topic) => setSearchQuery(`topic:${topic}`)}
              />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </main>
      </div>
    </div>
  );
}
