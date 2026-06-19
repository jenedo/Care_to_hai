import React, { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Stethoscope, LifeBuoy, CreditCard, Calendar, Shield } from "lucide-react";
import { useNotifications, type Notification, type NotificationType } from "@/contexts/NotificationContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function typeIcon(type: NotificationType) {
  switch (type) {
    case "doctor_application": return <Stethoscope className="h-4 w-4 text-blue-500" />;
    case "support_ticket": return <LifeBuoy className="h-4 w-4 text-orange-500" />;
    case "payment_failed": return <CreditCard className="h-4 w-4 text-red-500" />;
    case "appointment": return <Calendar className="h-4 w-4 text-violet-500" />;
    default: return <Shield className="h-4 w-4 text-gray-500" />;
  }
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationItem({ notif, onRead }: { notif: Notification; onRead: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => {
        onRead();
        if (notif.link) setLocation(notif.link);
      }}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0",
        !notif.read && "bg-primary/5"
      )}
    >
      <div className="mt-0.5 flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        {typeIcon(notif.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", !notif.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
            {notif.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
            {timeAgo(notif.timestamp)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
      </div>
      {!notif.read && (
        <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  );
}

export function Topbar() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissAll } = useNotifications();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });

  return (
    <header className="flex h-16 w-full items-center justify-between border-b bg-card px-6 z-30 relative">
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-muted-foreground border rounded-md px-3 py-1.5 bg-muted/50">
          {dateStr}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-xl border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{unreadCount} new</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={markAllAsRead}>
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={dismissAll}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                      <Bell className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <NotificationItem
                        key={n.id}
                        notif={n}
                        onRead={() => { markAsRead(n.id); setOpen(false); }}
                      />
                    ))
                  )}
                </div>

                <div className="border-t px-4 py-2.5 bg-muted/30 text-center">
                  <button className="text-xs text-primary font-medium hover:underline">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
