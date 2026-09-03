import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface AuthorBoxProps {
  name: string;
  avatar?: string;
  bio?: string;
}

export function AuthorBox({ name, avatar, bio }: AuthorBoxProps) {
  return (
    <Card className="mt-10 overflow-hidden">
      <CardContent className="flex items-start gap-4 p-6">
        <Avatar className="h-14 w-14">
          {avatar ? (
            <AvatarImage src={avatar} alt={name} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-foreground">{name}</div>
          {bio && (
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {bio}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}