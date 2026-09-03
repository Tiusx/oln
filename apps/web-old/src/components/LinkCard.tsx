import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { LinkItem } from "@/lib/api";

interface LinkCardProps {
  link: LinkItem;
}

export function LinkCard({ link }: LinkCardProps) {
  const firstChar = link.name?.charAt(0) || "?";
  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-sm">
      <a
        href={link.url}
        target="_blank"
        rel="noopener"
        className="flex items-center gap-3 p-4"
      >
        <Avatar>
          {link.avatar ? (
            <AvatarImage src={link.avatar} alt={link.name} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {firstChar}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {link.name}
          </div>
          {link.description && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {link.description}
            </div>
          )}
        </div>
      </a>
    </Card>
  );
}
