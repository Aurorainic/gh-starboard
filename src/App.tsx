import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CategorySection } from "@/components/CategorySection";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { useStars, MAX_STARS_FILTER } from "@/hooks/useStars";
import { useLanguage } from "@/i18n/useLanguage";
import { useT } from "@/i18n/useTranslation";
import { Loader2, AlertCircle, ChevronUp, X } from "lucide-react";

export default function App() {
  const { language, setLanguage, setAvailableLanguages } = useLanguage();
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
    aiCategories,
  } = useStars(language);

  // Sync available languages from data into context
  useEffect(() => {
    if (availableLanguages.length > 0) {
      setAvailableLanguages(availableLanguages);
    }
  }, [availableLanguages, setAvailableLanguages]);

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

  const [showBackToTop, setShowBackToTop] = useState(false);

  // Show back-to-top button when scrolled down
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top when category filter changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [filters.categories]);

  const handleCategoriesChange = useCallback(
    (cats: string[]) => {
      setFilters({ ...filters, categories: cats });
    },
    [filters, setFilters]
  );

  // Category name translation helper
  function catName(name: string) {
    return t(`category.${name}`) || name;
  }

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
        filters={filters}
        onFiltersChange={setFilters}
        totalEntries={totalEntries}
        categoriesCount={categories.length}
        siteConfig={siteConfig}
      />

      <div className="flex">
        <Sidebar
          categories={categories.map((cat) => ({
            name: cat,
            count: (groupedByCategory[cat] ?? []).length,
            isAi: aiCategories.includes(cat),
          }))}
          selectedCategories={filters.categories}
          onCategoriesChange={handleCategoriesChange}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filters={filters}
          onFiltersChange={setFilters}
          maxStarsValue={maxStarsValue}
          entryLanguages={entryLanguages}
        />

        <main className="flex-1 min-w-0 px-4 py-6 lg:px-8">
          {/* Active filter badges */}
          {(filters.categories.length > 0 || filters.languages.length > 0 || filters.minStars > 0 || filters.maxStars < MAX_STARS_FILTER) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filters.categories.map((cat) => (
                <Badge key={cat} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilters({ ...filters, categories: filters.categories.filter((c) => c !== cat) })}>
                  {catName(cat)}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {filters.languages.map((lang) => (
                <Badge key={lang} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilters({ ...filters, languages: filters.languages.filter((l) => l !== lang) })}>
                  {lang}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {(filters.minStars > 0 || filters.maxStars < MAX_STARS_FILTER) && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilters({ ...filters, minStars: 0, maxStars: MAX_STARS_FILTER })}>
                  {filters.minStars > 0 ? `≥${filters.minStars}` : ""}
                  {filters.minStars > 0 && filters.maxStars < MAX_STARS_FILTER ? " & " : ""}
                  {filters.maxStars < MAX_STARS_FILTER ? `≤${filters.maxStars}` : ""}
                  {" stars"}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <button onClick={() => setFilters({ languages: [], minStars: 0, maxStars: MAX_STARS_FILTER, categories: [] })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Clear all
              </button>
            </div>
          )}

          {/* Mobile category bar */}
          <div className="flex lg:hidden flex-wrap gap-1.5 my-4">
            <Badge
              variant={filters.categories.length === 0 ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => handleCategoriesChange([])}
            >
              {t("sidebar.all")}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={filters.categories.includes(cat) ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => {
                  const next = filters.categories.includes(cat)
                    ? filters.categories.filter((c) => c !== cat)
                    : [...filters.categories, cat];
                  handleCategoriesChange(next);
                }}
              >
                {catName(cat)}
              </Badge>
            ))}
          </div>

          {!hasResults && <EmptyState />}

          <div className="space-y-10">
            {paginatedCategories.map(({ category, entries }) => (
              <CategorySection
                key={category}
                category={catName(category)}
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
