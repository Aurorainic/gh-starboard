import { useState, useEffect } from "react";
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
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handleJump = () => {
    const n = parseInt(pageInput, 10);
    if (n >= 1 && n <= totalPages && n !== page) {
      onPageChange(n);
    } else {
      setPageInput(String(page));
    }
  };

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

        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{t("pagination.pagePrefix")}</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handleJump}
            onKeyDown={(e) => e.key === "Enter" && handleJump()}
            className="w-10 h-7 rounded border bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span>{t("pagination.pageSuffix", { total: totalPages })}</span>
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
