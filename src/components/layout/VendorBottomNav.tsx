"use client";

import { Home, ClipboardList, Package, DollarSign, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useNotifications } from "@/contexts/NotificationContext";

export function VendorBottomNav() {
  const pathname = usePathname();
  const { orderNotificationCount } = useNotifications();

  const navItems = [
    { icon: Home, label: "Home", href: "/vendor", badgeCount: 0 },
    { icon: ClipboardList, label: "Orders", href: "/vendor/orders", badgeCount: orderNotificationCount },
    { icon: Package, label: "Products", href: "/vendor/products", badgeCount: 0 },
    { icon: DollarSign, label: "Earnings", href: "/vendor/earnings", badgeCount: 0 },
    { icon: User, label: "Profile", href: "/vendor/profile", badgeCount: 0 },
  ];

  // Hide on certain pages (like auth pages)
  if (pathname.startsWith("/vendor/auth") || pathname === "/vendor/login") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full h-16 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/vendor" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 py-2 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.badgeCount > 0 && (
                  <NotificationBadge count={item.badgeCount} />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}




