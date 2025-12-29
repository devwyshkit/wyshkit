import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotFoundProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  className?: string;
}

export function NotFound({ 
  title = "Not Found", 
  message = "The page or resource you're looking for doesn't exist.",
  showHomeButton = true,
  className 
}: NotFoundProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-6", className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xs font-semibold text-muted-foreground">{title}</h1>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </div>
      {showHomeButton && (
        <Link href="/">
          <Button>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      )}
    </div>
  );
}


