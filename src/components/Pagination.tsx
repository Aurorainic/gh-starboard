import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useTranslation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  page,
  totalPages,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  const { t } = useT();

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("pagination.perPage")}</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="min-w-[120px] text-center text-sm text-muted-foreground">
          {t("pagination.page", { page, total: totalPages })}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
