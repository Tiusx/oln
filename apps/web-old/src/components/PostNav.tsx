import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PostNavProps {
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

export function PostNav({ prev, next }: PostNavProps) {
  if (!prev && !next) return null;
  return (
    <nav
      className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2"
      aria-label="上一篇 / 下一篇"
    >
      {prev ? (
        <Card className="group">
          <a
            href={`/posts/${prev.slug}`}
            className="flex h-full flex-col gap-1 p-4"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> 上一篇
            </span>
            <span className="line-clamp-2 text-[15px] font-semibold text-foreground transition-colors group-hover:text-primary">
              {prev.title}
            </span>
          </a>
        </Card>
      ) : (
        <div />
      )}
      {next ? (
        <Card className="group">
          <a
            href={`/posts/${next.slug}`}
            className="flex h-full flex-col gap-1 p-4 text-right"
          >
            <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              下一篇 <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="line-clamp-2 text-[15px] font-semibold text-foreground transition-colors group-hover:text-primary">
              {next.title}
            </span>
          </a>
        </Card>
      ) : (
        <div />
      )}
    </nav>
  );
}
