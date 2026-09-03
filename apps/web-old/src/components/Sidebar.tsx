import { ArrowUpRight, FolderOpen, Tags } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SidebarAuthor {
  name: string;
  avatar?: string;
  bio?: string;
}

interface SidebarProps {
  author?: SidebarAuthor;
  siteName: string;
  tags: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
  maxTags?: number;
}

export function Sidebar({ author, siteName, tags, categories, maxTags = 20 }: SidebarProps) {
  return (
    <aside className="home-sidebar flex flex-col gap-5">
      {author && (
        <Card className="bg-card">
          <CardContent className="flex items-center gap-3 p-5">
            <Avatar className="h-12 w-12">
              {author.avatar ? (
                <AvatarImage src={author.avatar} alt={author.name} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {author.name.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{author.name}</div>
              {author.bio && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {author.bio}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {categories.length > 0 && (
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-primary" />
              分类
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge
                key={c.id}
                variant="secondary"
                className="font-normal transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <a href={`/categories/${c.slug}`} className="hover:no-underline">
                  {c.name}
                </a>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {tags.length > 0 && (
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tags className="h-4 w-4 text-primary" />
              热门标签
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {tags.slice(0, maxTags).map((t) => (
              <Badge
                key={t.id}
                variant="outline"
                className="font-normal transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <a href={`/tags/${t.slug}`} className="hover:no-underline">
                  #{t.name}
                </a>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm">订阅</CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed text-muted-foreground">
          通过 RSS 订阅 {siteName} 的最新文章。
          <a
            href="/rss.xml"
            className="mt-2 flex items-center gap-1 font-medium text-primary hover:underline"
          >
            RSS 订阅
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    </aside>
  );
}