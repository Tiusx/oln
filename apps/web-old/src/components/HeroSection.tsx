import { ArrowRight, FileText, Layers, Tags } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HeroSectionProps {
  siteName: string;
  tagline: string;
  bioHtml: string;
  avatar?: string;
  authorName?: string;
  stats: { posts: number; tags: number; categories: number };
}

const statConfig = [
  { key: "posts", label: "文章", icon: FileText },
  { key: "tags", label: "标签", icon: Tags },
  { key: "categories", label: "分类", icon: Layers },
] as const;

export function HeroSection({
  siteName,
  tagline,
  bioHtml,
  avatar,
  authorName,
  stats,
}: HeroSectionProps) {
  return (
    <section className="relative">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-6 flex items-center gap-4">
            {avatar && (
              <Avatar className="h-16 w-16 ring-2 ring-border">
                <AvatarImage src={avatar} alt={authorName || siteName} />
                <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                  {(authorName || siteName).charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {tagline ? (
              <>
                {tagline.split(" ")[0]}{" "}
                <span className="text-primary">
                  {tagline.split(" ").slice(1).join(" ") || ""}
                </span>
              </>
            ) : (
              siteName
            )}
          </h1>
          {bioHtml && (
            <div
              className="home-bio mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: bioHtml }}
            />
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="/posts">
                浏览文章
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="/about">关于我</a>
            </Button>
          </div>
        </div>

        <div className="grid w-full max-w-[260px] shrink-0 grid-cols-1 gap-3 md:grid-cols-1 md:pl-2">
          {statConfig.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.key} className="bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold tabular-nums text-foreground">
                      {stats[s.key]}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}