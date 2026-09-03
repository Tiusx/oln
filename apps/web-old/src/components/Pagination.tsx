import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  base: string;
}

export function Pagination({ page, totalPages, base }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-12 flex items-center justify-center gap-3" aria-label="分页">
      {page > 1 ? (
        <Button variant="outline" size="sm" asChild>
          <a href={`${base}?page=${page - 1}`}>
            <ChevronLeft className="h-4 w-4" />
            上一页
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="h-4 w-4" />
          上一页
        </Button>
      )}
      <span className="text-sm text-muted-foreground tabular-nums">
        第 {page} / {totalPages} 页
      </span>
      {page < totalPages ? (
        <Button variant="outline" size="sm" asChild>
          <a href={`${base}?page=${page + 1}`}>
            下一页
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          下一页
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  );
}