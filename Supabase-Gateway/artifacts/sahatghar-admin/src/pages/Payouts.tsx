import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreHorizontal, CheckCircle2, XCircle, Clock, Wallet, Building2, AlertCircle, DollarSign } from "lucide-react";
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

export default function Payouts() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [actionTarget, setActionTarget] = React.useState<{ id: string; action: "approve" | "reject" | "paid" } | null>(null);
  const [detailTarget, setDetailTarget] = React.useState<any | null>(null);
  const [adminNotes, setAdminNotes] = React.useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payouts", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      params.set("limit", "50");
      const res = await fetch(`/api/payouts?${params}`);
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["payouts-stats"],
    queryFn: async () => (await fetch("/api/payouts/stats")).json(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: object }) => {
      const res = await fetch(`/api/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (_, { payload }: any) => {
      const s = (payload as any).status;
      toast({ title: `Payout ${s === "APPROVED" ? "approved" : s === "REJECTED" ? "rejected" : "marked as paid"}` });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["payouts-stats"] });
      setActionTarget(null);
      setAdminNotes("");
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const payouts = (data as any)?.data || data || [];
  const stats = statsData || {};
  const filtered = payouts.filter((p: any) => {
    if (!search) return true;
    return p.doctor_name?.toLowerCase().includes(search.toLowerCase()) || p.id?.includes(search);
  });

  const actionLabels: Record<string, string> = { approve: "Approve", reject: "Reject", paid: "Mark as Paid" };
  const statusMap: Record<string, string> = { approve: "APPROVED", reject: "REJECTED", paid: "PAID" };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Payouts</h1>
          <p className="text-muted-foreground">Manage doctor withdrawal and payout requests</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: stats.pending ?? 0, color: "border-l-amber-500", icon: Clock },
            { label: "Approved", value: stats.approved ?? 0, color: "border-l-blue-500", icon: CheckCircle2 },
            { label: "Paid", value: stats.paid ?? 0, color: "border-l-emerald-500", icon: DollarSign },
            { label: "Total Pending (PKR)", value: (stats.total_pending_amount ?? 0).toLocaleString(), color: "border-l-purple-500", icon: Wallet },
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
          <div className="p-4 border-b flex gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by doctor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requested</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-muted w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No payout requests found</td></tr>
                ) : (
                  filtered.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{p.doctor_name}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">PKR {p.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {p.wallet_provider ? (
                          <span className="flex items-center gap-1.5 text-xs"><Wallet className="h-3.5 w-3.5 text-muted-foreground" />{p.wallet_provider} · {p.wallet_number}</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{p.bank_name} · {p.account_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || ""}`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.requested_at).toLocaleDateString("en-PK")}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-40 truncate">{p.admin_notes || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDetailTarget(p)}>View Details</DropdownMenuItem>
                            {p.status === "PENDING" && (
                              <>
                                <DropdownMenuItem className="text-emerald-600" onClick={() => { setActionTarget({ id: p.id, action: "approve" }); setAdminNotes(""); }}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setActionTarget({ id: p.id, action: "reject" }); setAdminNotes(""); }}>
                                  <XCircle className="h-4 w-4 mr-2" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {p.status === "APPROVED" && (
                              <DropdownMenuItem className="text-blue-600" onClick={() => { setActionTarget({ id: p.id, action: "paid" }); setAdminNotes(""); }}>
                                Mark as Paid
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

      <Dialog open={!!detailTarget} onOpenChange={open => !open && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Payout Details</DialogTitle></DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Doctor</p><p className="font-medium">{detailTarget.doctor_name}</p></div>
                <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">PKR {detailTarget.amount?.toLocaleString()}</p></div>
                {detailTarget.bank_name && (
                  <>
                    <div><p className="text-muted-foreground">Bank</p><p>{detailTarget.bank_name}</p></div>
                    <div><p className="text-muted-foreground">Account Title</p><p>{detailTarget.account_title}</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground">IBAN</p><p className="font-mono text-xs">{detailTarget.iban}</p></div>
                  </>
                )}
                {detailTarget.wallet_provider && (
                  <>
                    <div><p className="text-muted-foreground">Wallet</p><p>{detailTarget.wallet_provider}</p></div>
                    <div><p className="text-muted-foreground">Number</p><p>{detailTarget.wallet_number}</p></div>
                  </>
                )}
                {detailTarget.admin_notes && <div className="col-span-2"><p className="text-muted-foreground">Notes</p><p>{detailTarget.admin_notes}</p></div>}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setDetailTarget(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!actionTarget} onOpenChange={open => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionTarget ? actionLabels[actionTarget.action] : ""} Payout</AlertDialogTitle>
            <AlertDialogDescription>This action will update the payout status.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea id="notes" className="mt-1" placeholder="Add notes..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionTarget && updateMutation.mutate({ id: actionTarget.id, payload: { status: statusMap[actionTarget.action], admin_notes: adminNotes } })}
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
