import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CategorySection } from "@/components/CategorySection";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { useStars } from "@/hooks/useStars";
import { useLanguage } from "@/i18n/useLanguage";
import { useT } from "@/i18n/useTranslation";
import { Loader2, AlertCircle, ChevronUp, X } from "lucide-react";

export default function App() {
  const { language, setLanguage, setAvailableLanguages, setUITranslations } = useLanguage();
  const { t } = useT();
  const {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filters,
    setFilters,
    entryLanguages,
    maxStarsValue,
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
    lastUpdated,
    uiTranslations,
    aiCategories,
  } = useStars(language);

  // Sync available languages from data into context
  useEffect(() => {
    if (availableLanguages.length > 0) {
      setAvailableLanguages(availableLanguages);
    }
  }, [availableLanguages, setAvailableLanguages]);

  // Sync AI-translated UI texts into context
  useEffect(() => {
    if (Object.keys(uiTranslations).length > 0) {
      setUITranslations(uiTranslations);
    }
  }, [uiTranslations, setUITranslations]);

  // Correct language only after data has loaded
  useEffect(() => {
    if (
      !loading &&
      availableLanguages.length > 0 &&
      !availableLanguages.includes(language)
    ) {
      setLanguage(availableLanguages[0]);
    }
  }, [loading, availableLanguages, language, setLanguage]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Show back-to-top button when scrolled down
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      // Category not on current page — find which page it's on
      const catIndex = categories.indexOf(cat);
      if (catIndex === -1) return;
      // Count entries up to this category to determine page
      let count = 0;
      for (let i = 0; i < catIndex; i++) {
        count += (groupedByCategory[categories[i]] ?? []).length;
      }
      const targetPage = Math.floor(count / perPage) + 1;
      if (targetPage !== page) {
        setPage(targetPage);
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{t("error.loadFailed")}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary hover:underline"
        >
          {t("error.retry")}
        </button>
      </div>
    );
  }

  const hasResults = paginatedCategories.length > 0;

  return (
    <div className="min-h-screen">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onHomeClick={() => { setSearchQuery(""); window.scrollTo({ top: 0 }); }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filters={filters}
        onFiltersChange={setFilters}
        entryLanguages={entryLanguages}
        maxStarsValue={maxStarsValue}
        totalEntries={totalEntries}
        categoriesCount={categories.length}
        siteConfig={siteConfig}
      />

      <div className="flex">
        <Sidebar
          categories={categories}
          aiCategories={aiCategories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />

        <main className="flex-1 min-w-0 px-4 py-6 lg:px-8">
          {/* Active filter badges */}
          {(filters.languages.length > 0 || filters.minStars > 0 || filters.maxStars < Infinity) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filters.languages.map((lang) => (
                <Badge key={lang} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilters({ ...filters, languages: filters.languages.filter((l) => l !== lang) })}>
                  {lang}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {(filters.minStars > 0 || filters.maxStars < Infinity) && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilters({ ...filters, minStars: 0, maxStars: Infinity })}>
                  {filters.minStars > 0 ? `≥${filters.minStars}` : ""}
                  {filters.minStars > 0 && filters.maxStars < Infinity ? " & " : ""}
                  {filters.maxStars < Infinity ? `≤${filters.maxStars}` : ""}
                  {" stars"}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <button onClick={() => setFilters({ languages: [], minStars: 0, maxStars: Infinity, category: "" })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Clear all
              </button>
            </div>
          )}

          {/* Mobile category bar */}
          <div className="flex lg:hidden flex-wrap gap-1.5 my-4">
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
                isAiCategory={aiCategories.includes(category)}
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

      <Footer lastUpdated={lastUpdated} projectUrl={siteConfig.projectUrl} />

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 h-9 w-9 rounded-full border bg-background/95 shadow-md backdrop-blur hover:bg-accent transition-colors flex items-center justify-center"
          aria-label={t("backToTop")}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
