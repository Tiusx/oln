import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Quote {
  content: string;
  creator?: string | null;
}

export function Hitokoto() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/hitokoto");
      const data = await res.json();
      if (data?.data) {
        setQuote({
          content: data.data.content,
          creator: data.data.creator,
        });
      }
    } catch (err) {
      console.error("Failed to fetch hitokoto:", err);
      setQuote({ content: "语录加载失败" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-8">
          <blockquote className="text-2xl leading-relaxed text-foreground">
            <span className="text-primary">“</span>
            {quote?.content ?? "加载中..."}
            <span className="text-primary">”</span>
          </blockquote>
          <cite className="mt-4 block not-italic text-muted-foreground">
            — {quote?.creator || "语录生成中"}
          </cite>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchQuote} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          刷新
        </Button>
      </div>
    </div>
  );
}
