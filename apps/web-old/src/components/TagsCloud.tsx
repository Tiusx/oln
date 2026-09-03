import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagsCloudProps {
  tags: Tag[];
  className?: string;
}

export function TagsCloud({ tags, className }: TagsCloudProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((t) => (
        <Badge
          key={t.id}
          variant="secondary"
          className="px-3 py-1 text-sm font-normal transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <a href={`/tags/${t.slug}`} className="hover:no-underline">
            #{t.name}
          </a>
        </Badge>
      ))}
    </div>
  );
}