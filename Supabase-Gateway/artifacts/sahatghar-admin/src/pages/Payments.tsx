import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListPayments,
  useGetPaymentStats,
  useInitiateRefund,
  getListPaymentsQueryKey,
  getGetPaymentStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Download, RefreshCw, MoreHorizontal, ArrowRightLeft, CreditCard, User, Stethoscope, Calendar, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Payments() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [refundTarget, setRefundTarget] = React.useState<{ id: string; amount: number } | null>(null);
  const [detailTarget, setDetailTarget] = React.useState<any | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetPaymentStats();
  const { data: paymentsList, isLoading } = useListPayments();

  const refund = useInitiateRefund({
    mutation: {
      onSuccess: () => {
        toast({ title: "Refund initiated", description: "The payment has been marked for refund." });
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPaymentStatsQueryKey() });
        setRefundTarget(null);
      },
      onError: () => {
        toast({ title: "Refund failed", description: "Could not initiate refund.", variant: "destructive" });
        setRefundTarget(null);
      },
    },
  });

  const allPayments = React.useMemo(() => {
    return (paymentsList as any)?.data || paymentsList || [];
  }, [paymentsList]);

  const filtered = React.useMemo(() => {
    return allPayments.filter((p: any) => {
      const matchSearch = !search || p.patient_name?.toLowerCase().includes(search.toLowerCase()) || p.id?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || p.status === status;
      return matchSearch && matchStatus;
    });
  }, [allPayments, search, status]);

  const refunded = React.useMemo(() => allPayments.filter((p: any) => p.status === "refunded"), [allPayments]);
  const failed = React.useMemo(() => allPayments.filter((p: any) => p.status === "failed"), [allPayments]);

  const exportCSV = () => {
    const headers = ["Transaction ID", "Patient", "Doctor", "Amount (PKR)", "Gateway", "Status", "Date"];
    const rows = allPayments.map((p: any) => [
      p.id,
      `"${p.patient_name || ""}"`,
      `"${p.doctor_name || ""}"`,
      p.amount,
      p.gateway || "",
      p.status,
      new Date(p.date).toLocaleDateString("en-PK"),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${allPayments.length} transactions downloaded.` });
  };

  const PaymentsTable = ({ data }: { data: any[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transaction ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gateway</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b animate-pulse">
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-muted w-20" /></td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No transactions found</td>
            </tr>
          ) : (
            data.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.patient_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.doctor_name}</td>
                <td className="px-4 py-3 font-semibold">PKR {p.amount?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                    <ArrowRightLeft className="h-3 w-3" />
                    {p.gateway}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.date).toLocaleDateString("en-PK")}</td>
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
                      <DropdownMenuItem onClick={() => setDetailTarget(p)}>
                        <Receipt className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      {p.status === "completed" && (
                        <DropdownMenuItem
                          className="text-orange-600"
                          onClick={() => setRefundTarget({ id: p.id, amount: p.amount })}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Initiate Refund
                        </DropdownMenuItem>
                      )}
                      {(p.status === "refunded" || p.status === "cancelled") && (
                        <DropdownMenuItem onClick={() => setDetailTarget(p)}>
                          <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />
                          View Refund Status
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => {
                        const text = `Txn: ${p.id}\nPatient: ${p.patient_name}\nAmount: PKR ${p.amount?.toLocaleString()}\nStatus: ${p.status}\nDate: ${new Date(p.date).toLocaleDateString("en-PK")}`;
                        const blob = new Blob([text], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `receipt_${p.id}.txt`; a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "Receipt downloaded" });
                      }}>
                        Download Receipt
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
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments & Reconciliation</h1>
            <p className="text-muted-foreground">Manage transactions, refunds, and doctor payouts</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={allPayments.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Total Collected</span>
              <span className="text-2xl font-bold">PKR {(stats?.total_collected || 0).toLocaleString()}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Pending Payouts</span>
              <span className="text-2xl font-bold">PKR {(stats?.doctor_pending_payouts || 0).toLocaleString()}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Unmatched</span>
              <span className="text-2xl font-bold">{stats?.unmatched || 0}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Failed Transactions</span>
              <span className="text-2xl font-bold">{stats?.failed_count || 0}</span>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="refunds">
              Refunds {refunded.length > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs rounded-full px-1.5">{refunded.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed {failed.length > 0 && <span className="ml-1.5 bg-red-100 text-red-700 text-xs rounded-full px-1.5">{failed.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card className="shadow-sm">
              <div className="p-4 border-b flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-56">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient or transaction ID..."
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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PaymentsTable data={filtered} />
            </Card>
          </TabsContent>

          <TabsContent value="refunds" className="mt-4">
            <Card className="shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Refund Transactions</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{refunded.length} refund{refunded.length !== 1 ? "s" : ""} processed</p>
              </div>
              <PaymentsTable data={refunded} />
            </Card>
          </TabsContent>

          <TabsContent value="failed" className="mt-4">
            <Card className="shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Failed Transactions</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{failed.length} failed payment{failed.length !== 1 ? "s" : ""}</p>
                </div>
                {failed.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <RefreshCw className="h-4 w-4" /> Retry All Failed
                  </Button>
                )}
              </div>
              <PaymentsTable data={failed} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={open => !open && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Payment Details
            </DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md">
                <span className="font-mono text-xs text-muted-foreground">{detailTarget.id}</span>
                <StatusBadge status={detailTarget.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Patient</p>
                    <p className="font-medium">{detailTarget.patient_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Stethoscope className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Doctor</p>
                    <p className="font-medium">{detailTarget.doctor_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    <p className="font-semibold text-lg">PKR {detailTarget.amount?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRightLeft className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Gateway</p>
                    <p className="font-medium">{detailTarget.gateway}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{new Date(detailTarget.created_at).toLocaleString("en-PK")}</p>
                  </div>
                </div>
                {detailTarget.payment_method && (
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">Method</p>
                      <p className="font-medium">{detailTarget.payment_method}</p>
                    </div>
                  </div>
                )}
              </div>
              {(detailTarget.status === "refunded" || detailTarget.status === "cancelled") && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                  This transaction has been <strong>{detailTarget.status}</strong>. No further action required.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailTarget?.status === "completed" && (
              <Button
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => { setDetailTarget(null); setRefundTarget({ id: detailTarget.id, amount: detailTarget.amount }); }}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Initiate Refund
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation */}
      <AlertDialog open={!!refundTarget} onOpenChange={open => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initiate Refund</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund <strong>PKR {refundTarget?.amount?.toLocaleString()}</strong> for transaction <code className="text-xs bg-muted px-1 rounded">{refundTarget?.id}</code>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => refundTarget && refund.mutate({ id: refundTarget.id, data: { reason: "Admin initiated refund" } })}
              disabled={refund.isPending}
            >
              {refund.isPending ? "Processing..." : "Confirm Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
