import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListSupportTickets,
  useGetSupportStats,
  useUpdateSupportTicket,
  getListSupportTicketsQueryKey,
  getGetSupportStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Clock, AlertCircle, MoreHorizontal, CheckCircle2, MessageSquare, User, Tag, Calendar, FileText, IndentDecrease } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export default function SupportTickets() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [threadTarget, setThreadTarget] = React.useState<any | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetSupportStats();
  const { data: ticketsList, isLoading } = useListSupportTickets();

  const updateTicket = useUpdateSupportTicket({
    mutation: {
      onSuccess: (_, vars) => {
        const s = (vars.data as any).status;
        const action = s === "resolved" ? "resolved" : s === "in_progress" ? "assigned" : "closed";
        toast({ title: `Ticket ${action}`, description: "Ticket status has been updated." });
        queryClient.invalidateQueries({ queryKey: getListSupportTicketsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSupportStatsQueryKey() });
        if (threadTarget?.id === vars.id) {
          setThreadTarget((prev: any) => prev ? { ...prev, status: s } : null);
        }
      },
      onError: () => {
        toast({ title: "Action failed", variant: "destructive" });
      },
    },
  });

  const allTickets = React.useMemo(() => {
    return (ticketsList as any)?.data || ticketsList || [];
  }, [ticketsList]);

  const filtered = React.useMemo(() => {
    return allTickets.filter((t: any) => {
      const matchSearch = !search ||
        t.category?.toLowerCase().includes(search.toLowerCase()) ||
        t.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
        t.raised_by?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || t.status === status || t.status === status.replace("_", "-");
      const matchPriority = priority === "all" || t.priority === priority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [allTickets, search, status, priority]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-muted-foreground">Manage user inquiries and disputes</p>
          </div>
        </div>

        <Card className="bg-primary text-primary-foreground shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-primary-foreground/20">
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 text-primary-foreground/80 mb-2 text-sm">
                <Clock className="h-4 w-4" /> Avg Response Time
              </div>
              <div className="text-3xl font-bold">{stats?.avg_response_time || "—"}</div>
            </div>
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 text-primary-foreground/80 mb-2 text-sm">
                <AlertCircle className="h-4 w-4" /> SLA Breaches
              </div>
              <div className="text-3xl font-bold">{stats?.sla_breaches || 0}</div>
            </div>
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between text-primary-foreground/80 mb-2 text-sm">
                <span>SLA Compliance</span>
                <span className="font-bold">{stats?.sla_compliance || 0}%</span>
              </div>
              <Progress value={stats?.sla_compliance || 0} className="h-2 bg-primary-foreground/20 [&>div]:bg-white" />
              <p className="text-xs text-primary-foreground/60 mt-2">Target: 95%</p>
            </div>
            <div className="p-6 flex-1">
              <div className="text-primary-foreground/80 mb-2 text-sm">Closed This Week</div>
              <div className="text-3xl font-bold">{stats?.tickets_closed_week || 0}</div>
              <p className="text-xs text-primary-foreground/60 mt-1">Avg resolution: {stats?.avg_resolution_time || "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, category, or user..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ticket</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Raised By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 rounded bg-muted w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No tickets found</td>
                  </tr>
                ) : (
                  filtered.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-1 max-w-[200px]">{t.category}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.ticket_id || t.id}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.raised_by || t.user_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t.user_type || "patient"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(PRIORITY_COLOR[t.priority] || "secondary") as any} className="capitalize text-xs">
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(t.date || t.created_at).toLocaleDateString("en-PK")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setThreadTarget(t)}>
                              <MessageSquare className="h-4 w-4 mr-2" /> View Thread
                            </DropdownMenuItem>
                            {t.status !== "in_progress" && t.status !== "in-progress" && t.status !== "resolved" && t.status !== "closed" && (
                              <DropdownMenuItem
                                onClick={() => updateTicket.mutate({ id: t.id, data: { status: "in_progress" } })}
                              >
                                Assign to Agent
                              </DropdownMenuItem>
                            )}
                            {t.status !== "resolved" && t.status !== "closed" && (
                              <DropdownMenuItem
                                className="text-emerald-600"
                                onClick={() => updateTicket.mutate({ id: t.id, data: { status: "resolved" } })}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Resolved
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => updateTicket.mutate({ id: t.id, data: { status: "closed" } })}
                              className="text-muted-foreground"
                            >
                              Close Ticket
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* View Thread Dialog */}
      <Dialog open={!!threadTarget} onOpenChange={open => !open && setThreadTarget(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Ticket Thread
            </DialogTitle>
          </DialogHeader>
          {threadTarget && (
            <div className="space-y-4 py-2">
              {/* Ticket Header */}
              <div className="flex items-start justify-between gap-2 p-3 bg-muted/40 rounded-md">
                <div>
                  <p className="font-semibold">{threadTarget.category}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{threadTarget.ticket_id || threadTarget.id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={(PRIORITY_COLOR[threadTarget.priority] || "secondary") as any} className="capitalize text-xs">
                    {threadTarget.priority}
                  </Badge>
                  <StatusBadge status={threadTarget.status} />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Raised By</p>
                    <p className="font-medium">{threadTarget.raised_by}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">User Type</p>
                    <p className="font-medium capitalize">{threadTarget.user_type || "patient"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(threadTarget.date || threadTarget.created_at).toLocaleString("en-PK")}</p>
                  </div>
                </div>
                {threadTarget.assigned_to && (
                  <div className="flex items-center gap-2">
                    <IndentDecrease className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned To</p>
                      <p className="font-medium">{threadTarget.assigned_to}</p>
                    </div>
                  </div>
                )}
                {threadTarget.refund_amount && (
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="p-1 bg-amber-100 rounded text-amber-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refund Amount</p>
                      <p className="font-semibold text-amber-700">PKR {threadTarget.refund_amount?.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issue Description</p>
                <div className="bg-muted/40 rounded-md p-3 text-sm leading-relaxed">
                  {threadTarget.description || "No description provided."}
                </div>
              </div>

              {/* Resolution Notes */}
              {threadTarget.resolution_notes && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Resolution Notes</p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm leading-relaxed text-emerald-800">
                    {threadTarget.resolution_notes}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {threadTarget && threadTarget.status !== "resolved" && threadTarget.status !== "closed" && (
              <Button
                variant="outline"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => updateTicket.mutate({ id: threadTarget.id, data: { status: "resolved" } })}
                disabled={updateTicket.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Resolved
              </Button>
            )}
            <Button variant="ghost" onClick={() => setThreadTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
