import { Clock, Folder } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface ArticleHeaderProps {
  title: string;
  date: string;
  updatedLabel?: string | null;
  category?: { name: string; slug: string } | null;
  readingLabel?: string | null;
  tags: { id: string; name: string; slug: string }[];
  pinned?: boolean;
}

export function ArticleHeader({
  title,
  date,
  updatedLabel,
  category,
  readingLabel,
  tags,
  pinned,
}: ArticleHeaderProps) {
  return (
    <header className="mb-10">
      {pinned && (
        <Badge variant="destructive" className="mb-4 text-[10px] uppercase tracking-wide">
          置顶
        </Badge>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <time dateTime={date} className="tabular-nums">{date}</time>
        {updatedLabel && <span>{updatedLabel}</span>}
        {category && (
          <a
            href={`/categories/${category.slug}`}
            className="inline-flex items-center gap-1 transition-colors hover:text-primary"
          >
            <Folder className="h-3.5 w-3.5" />
            {category.name}
          </a>
        )}
        {readingLabel && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            约 {readingLabel}
          </span>
        )}
      </div>
      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Badge
              key={t.id}
              variant="secondary"
              className="text-xs font-normal transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <a href={`/tags/${t.slug}`} className="hover:no-underline">
                #{t.name}
              </a>
            </Badge>
          ))}
        </div>
      )}
    </header>
  );
}