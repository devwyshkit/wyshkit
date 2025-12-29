"use client";

import { Home, Search, ClipboardList, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useNotifications } from "@/contexts/NotificationContext";

export function BottomNav() {
  const pathname = usePathname();
  const { orderNotificationCount, accountNotificationCount } = useNotifications();

  const navItems = [
    { icon: Home, label: "Home", href: "/", badgeCount: 0 },
    { icon: Search, label: "Search", href: "/search", badgeCount: 0 },
    { icon: ClipboardList, label: "Orders", href: "/orders", badgeCount: orderNotificationCount },
    { icon: User, label: "Account", href: "/profile", badgeCount: accountNotificationCount },
  ];

  if (pathname === "/cart") return null;

  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full bg-background border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 py-2 transition-colors relative",
                "active:scale-95 transition-transform",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                {item.badgeCount > 0 && (
                  <NotificationBadge count={item.badgeCount} />
                )}
              </div>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
