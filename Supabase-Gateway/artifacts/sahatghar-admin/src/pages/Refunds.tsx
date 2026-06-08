import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, RefreshCw, CheckCircle2, XCircle, DollarSign, Clock, AlertCircle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const REFUND_STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  PROCESSED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

async function fetchRefunds(status?: string) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  params.set("limit", "50");
  const res = await fetch(`/api/refunds?${params}`);
  return res.json();
}

async function updateRefund(id: string, data: object) {
  const res = await fetch(`/api/refunds/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default function Refunds() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [actionTarget, setActionTarget] = React.useState<{ id: string; action: "approve" | "reject" | "process" } | null>(null);
  const [detailTarget, setDetailTarget] = React.useState<any | null>(null);
  const [adminNotes, setAdminNotes] = React.useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["refunds", status],
    queryFn: () => fetchRefunds(status),
  });

  const { data: statsData } = useQuery({
    queryKey: ["refunds-stats"],
    queryFn: async () => {
      const res = await fetch("/api/refunds/stats");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) => updateRefund(id, payload),
    onSuccess: (_, { payload }: any) => {
      const s = (payload as any).status;
      toast({ title: `Refund ${s === "APPROVED" ? "approved" : s === "REJECTED" ? "rejected" : "processed"}`, description: "Refund status updated." });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["refunds-stats"] });
      setActionTarget(null);
      setAdminNotes("");
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const refunds = (data as any)?.data || data || [];
  const stats = statsData || {};

  const filtered = refunds.filter((r: any) => {
    if (!search) return true;
    return r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.id?.includes(search);
  });

  const handleAction = () => {
    if (!actionTarget) return;
    const newStatus = actionTarget.action === "approve" ? "APPROVED"
      : actionTarget.action === "reject" ? "REJECTED" : "PROCESSED";
    updateMutation.mutate({ id: actionTarget.id, payload: { status: newStatus, admin_notes: adminNotes } });
  };

  const actionLabels: Record<string, string> = { approve: "Approve", reject: "Reject", process: "Mark Processed" };
  const actionColors: Record<string, string> = {
    approve: "bg-emerald-600 hover:bg-emerald-700",
    reject: "bg-destructive hover:bg-destructive/90",
    process: "bg-blue-600 hover:bg-blue-700",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Refund Requests</h1>
          <p className="text-muted-foreground">Review and process patient refund requests</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: stats.pending ?? 0, color: "border-l-amber-500", icon: Clock },
            { label: "Approved", value: stats.approved ?? 0, color: "border-l-blue-500", icon: CheckCircle2 },
            { label: "Processed", value: stats.processed ?? 0, color: "border-l-emerald-500", icon: RefreshCw },
            { label: "Rejected", value: stats.rejected ?? 0, color: "border-l-red-500", icon: XCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} className={`shadow-sm border-l-4 ${color}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by patient, doctor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PROCESSED">Processed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Refund ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requested</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-muted w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No refund requests found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                      <td className="px-4 py-3 font-medium">{r.patient_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.doctor_name}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">PKR {r.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-48 truncate" title={r.reason}>{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${REFUND_STATUS_COLORS[r.status] || ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.requested_at).toLocaleDateString("en-PK")}</td>
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
                            <DropdownMenuItem onClick={() => setDetailTarget(r)}>View Details</DropdownMenuItem>
                            {r.status === "REQUESTED" && (
                              <>
                                <DropdownMenuItem className="text-emerald-600" onClick={() => { setActionTarget({ id: r.id, action: "approve" }); setAdminNotes(""); }}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setActionTarget({ id: r.id, action: "reject" }); setAdminNotes(""); }}>
                                  <XCircle className="h-4 w-4 mr-2" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {r.status === "APPROVED" && (
                              <DropdownMenuItem className="text-blue-600" onClick={() => { setActionTarget({ id: r.id, action: "process" }); setAdminNotes(""); }}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Mark Processed
                              </DropdownMenuItem>
                            )}
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

      {/* Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={open => !open && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Refund Details</DialogTitle></DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Patient</p><p className="font-medium">{detailTarget.patient_name}</p></div>
                <div><p className="text-muted-foreground">Doctor</p><p className="font-medium">{detailTarget.doctor_name}</p></div>
                <div><p className="text-muted-foreground">Amount</p><p className="font-semibold text-emerald-700">PKR {detailTarget.amount?.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Method</p><p className="font-medium">{detailTarget.payment_method}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Reason</p><p>{detailTarget.reason}</p></div>
                {detailTarget.admin_notes && <div className="col-span-2"><p className="text-muted-foreground">Admin Notes</p><p>{detailTarget.admin_notes}</p></div>}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setDetailTarget(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <AlertDialog open={!!actionTarget} onOpenChange={open => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionTarget ? actionLabels[actionTarget.action] : ""} Refund</AlertDialogTitle>
            <AlertDialogDescription>Please add a note before proceeding.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="notes" className="text-sm">Admin Notes</Label>
            <Textarea id="notes" className="mt-1" placeholder="Add notes..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionTarget ? actionColors[actionTarget.action] : ""}
              onClick={handleAction}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Processing..." : actionTarget ? actionLabels[actionTarget.action] : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
