"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, Store, Package, AlertCircle, CheckCircle2, 
  ChevronRight, ArrowLeft, Filter, Trash2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: any;
  createdAt: string;
}

/**
 * Admin Notifications Page
 * Swiggy Dec 2025 pattern: Tabbed alerts, priority-coded cards, real-time feel
 */
function AdminNotificationsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Fetch notifications for the admin
      const data = await apiClient.get<{ notifications: Notification[] }>("/notifications");
      setNotifications(data.notifications);
    } catch (error) {
      logger.error("[AdminNotifications] Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch("/notifications", { markAllAsRead: true });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      logger.error("[AdminNotifications] Failed to mark all as read", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch("/notifications", { notificationId: id });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      logger.error("[AdminNotifications] Failed to mark as read", error);
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === "all") return notifications;
    if (activeTab === "vendors") return notifications.filter(n => n.type === "vendor" || n.data?.category === "vendor");
    if (activeTab === "orders") return notifications.filter(n => n.type === "order" || n.data?.category === "order");
    if (activeTab === "system") return notifications.filter(n => n.type === "system" || n.data?.category === "system");
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-primary font-bold"
          onClick={markAllAsRead}
        >
          Mark all read
        </Button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white border h-11 p-1 rounded-xl">
            <TabsTrigger value="all" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="vendors" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Vendors</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
            <TabsTrigger value="system" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">System</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white p-4 rounded-xl border space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-900">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No new notifications in this category</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const isUrgent = notification.data?.priority === "high" || notification.title.toLowerCase().includes("breach");
                const isVendor = notification.type === "vendor" || notification.data?.category === "vendor";
                const isOrder = notification.type === "order" || notification.data?.category === "order";

                return (
                  <div 
                    key={notification.id}
                    className={cn(
                      "bg-white p-4 rounded-2xl border transition-all cursor-pointer relative",
                      !notification.read && "border-blue-100 bg-blue-50/10 shadow-sm",
                      notification.read && "opacity-80"
                    )}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      if (notification.data?.orderId) router.push(`/admin/orders/${notification.data.orderId}`);
                      if (notification.data?.vendorId) router.push(`/admin/vendors/${notification.data.vendorId}`);
                    }}
                  >
                    {!notification.read && (
                      <div className={cn(
                        "absolute top-4 right-4 w-2 h-2 rounded-full",
                        isUrgent ? "bg-red-500 animate-pulse" : "bg-blue-500"
                      )} />
                    )}

                    <div className="flex gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        isVendor ? "bg-blue-100 text-blue-600" : 
                        isOrder ? (isUrgent ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600") :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {isVendor ? <Store className="w-5 h-5" /> : 
                         isOrder ? (isUrgent ? <AlertCircle className="w-5 h-5" /> : <Package className="w-5 h-5" />) :
                         <Bell className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={cn("text-sm font-bold truncate", !notification.read ? "text-slate-900" : "text-slate-600")}>
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {notification.data?.actionText && (
                            <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                              {notification.data.actionText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminNotificationsContent />
    </ProtectedRoute>
  );
}
