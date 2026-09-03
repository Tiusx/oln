import { Menu, Rss } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavLink {
  label: string;
  url: string;
  target?: string;
  rel?: string;
}

interface MobileNavProps {
  brand: string;
  links: NavLink[];
  currentPath: string;
}

export function MobileNav({ brand, links, currentPath }: MobileNavProps) {
  const isCurrent = (url: string) =>
    url === "/" ? currentPath === "/" || currentPath === "" : currentPath.startsWith(url);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="flex lg:hidden" aria-label="菜单">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-72 flex-col gap-0 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-left">{brand}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {links.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target={item.target}
              rel={item.rel}
              aria-current={isCurrent(item.url) ? "true" : undefined}
              className="flex items-center rounded-md px-3 py-2.5 text-[15px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground data-[current='true']:bg-accent data-[current='true']:text-foreground"
              data-current={isCurrent(item.url) ? "true" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t px-3 py-4">
          <Button variant="ghost" size="sm" asChild className="justify-start gap-2">
            <a href="/rss.xml" aria-label="RSS 订阅">
              <Rss className="h-4 w-4" />
              RSS 订阅
            </a>
          </Button>
          <ThemeToggle variant="full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
