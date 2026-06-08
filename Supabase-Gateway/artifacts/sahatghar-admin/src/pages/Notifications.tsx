import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, ShieldCheck, CreditCard, LifeBuoy, Star, AlertCircle, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const TYPE_ICONS: Record<string, React.ElementType> = {
  VERIFICATION: ShieldCheck,
  PAYMENT: CreditCard,
  SUPPORT: LifeBuoy,
  REVIEW: Star,
  PAYOUT: Wallet,
  APPOINTMENT: Bell,
  SYSTEM: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  VERIFICATION: "bg-blue-100 text-blue-600",
  PAYMENT: "bg-emerald-100 text-emerald-600",
  SUPPORT: "bg-amber-100 text-amber-600",
  REVIEW: "bg-yellow-100 text-yellow-600",
  PAYOUT: "bg-purple-100 text-purple-600",
  APPOINTMENT: "bg-indigo-100 text-indigo-600",
  SYSTEM: "bg-gray-100 text-gray-600",
};

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await fetch("/api/notifications?limit=50")).json(),
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "All notifications marked as read" });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = (data as any)?.data || data || [];
  const unread = notifications.filter((n: any) => n.status === "PENDING").length;

  const grouped = React.useMemo(() => {
    const today: any[] = [];
    const older: any[] = [];
    const now = new Date();
    notifications.forEach((n: any) => {
      const d = new Date(n.created_at);
      const diffHours = (now.getTime() - d.getTime()) / 3600000;
      if (diffHours < 24) today.push(n);
      else older.push(n);
    });
    return { today, older };
  }, [notifications]);

  const NotificationItem = ({ n }: { n: any }) => {
    const Icon = TYPE_ICONS[n.type] || Bell;
    const colorClass = TYPE_COLORS[n.type] || "bg-gray-100 text-gray-600";
    const isUnread = n.status === "PENDING";

    return (
      <div
        className={`flex items-start gap-4 p-4 border-b last:border-0 transition-colors cursor-pointer hover:bg-muted/30 ${isUnread ? "bg-primary/5" : ""}`}
        onClick={() => isUnread && markReadMutation.mutate(n.id)}
      >
        <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>{n.title}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {new Date(n.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded ${colorClass}`}>{n.type}</span>
            {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              {unread > 0 ? `${unread} unread notification${unread !== 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="outline" className="gap-2" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark All Read
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="shadow-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 border-b animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-40" />
                  <div className="h-2.5 bg-muted rounded w-64" />
                </div>
              </div>
            ))}
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No notifications yet</p>
            </div>
          </Card>
        ) : (
          <>
            {grouped.today.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Today</p>
                <Card className="shadow-sm divide-y">
                  {grouped.today.map((n: any) => <NotificationItem key={n.id} n={n} />)}
                </Card>
              </div>
            )}
            {grouped.older.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Earlier</p>
                <Card className="shadow-sm divide-y">
                  {grouped.older.map((n: any) => <NotificationItem key={n.id} n={n} />)}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
