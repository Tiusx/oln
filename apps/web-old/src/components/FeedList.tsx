import { Clock, Tag as TagIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface FeedItem {
  slug: string;
  title: string;
  excerpt: string | null;
  date: string;
  category?: { name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
  pinned?: boolean;
  readingLabel?: string | null;
}

interface FeedListProps {
  title: string;
  items: FeedItem[];
  moreHref?: string;
  moreLabel?: string;
}

export function FeedList({ title, items, moreHref, moreLabel }: FeedListProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {moreHref && (
          <a
            href={moreHref}
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            {moreLabel || "查看全部"} →
          </a>
        )}
      </div>
      <Card>
        <CardHeader className="p-0">
          <Separator />
        </CardHeader>
        <CardContent className="p-0">
          {items.map((item, i) => (
            <div key={item.slug}>
              {i > 0 && <Separator />}
              <a
                href={`/posts/${item.slug}`}
                className="group block p-5 transition-colors hover:bg-accent/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {item.pinned && (
                    <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                      置顶
                    </Badge>
                  )}
                  <h3 className="flex-1 text-[16px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  <time className="text-xs tabular-nums text-muted-foreground">
                    {item.date}
                  </time>
                </div>
                {item.excerpt && (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {item.excerpt}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {item.category && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <TagIcon className="h-3 w-3" />
                      {item.category.name}
                    </span>
                  )}
                  {item.readingLabel && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.readingLabel}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">
                        #{t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </a>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}