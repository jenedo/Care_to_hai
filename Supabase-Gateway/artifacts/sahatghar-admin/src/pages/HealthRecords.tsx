import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Database, FileX, AlertTriangle, Download, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type DeleteRequest = {
  id: string;
  patient: string;
  date: string;
  reason: string;
  records: number;
  status: string;
};

const INITIAL_REQUESTS: DeleteRequest[] = [
  { id: "dr1", patient: "Ahmed Khan", date: "May 21, 2025", reason: "No longer using service", records: 14, status: "Pending" },
  { id: "dr2", patient: "Fatima Ali", date: "May 20, 2025", reason: "Privacy concerns", records: 3, status: "Pending" },
  { id: "dr3", patient: "Sara Imran", date: "May 19, 2025", reason: "Data portability request", records: 8, status: "Pending" },
];

const COMPLIANCE_METRICS = [
  { label: "PHI Access Audit", value: 100, status: "Compliant" },
  { label: "Encryption at Rest", value: 100, status: "Compliant" },
  { label: "Encryption in Transit", value: 100, status: "Compliant" },
  { label: "Data Retention Policy", value: 92, status: "Partial" },
  { label: "Access Logs Retained", value: 100, status: "Compliant" },
  { label: "Deletion Request SLA (30d)", value: 78, status: "Review" },
];

export default function HealthRecords() {
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteRequest | null>(null);
  const [complianceOpen, setComplianceOpen] = React.useState(false);
  const [requests, setRequests] = React.useState<DeleteRequest[]>(INITIAL_REQUESTS);
  const [processing, setProcessing] = React.useState(false);
  const { toast } = useToast();

  const handleProcessDeletion = () => {
    if (!deleteTarget) return;
    setProcessing(true);
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === deleteTarget.id ? { ...r, status: "Processed" } : r));
      toast({
        title: "Deletion processed",
        description: `${deleteTarget.records} records for ${deleteTarget.patient} have been queued for deletion.`,
      });
      setProcessing(false);
      setDeleteTarget(null);
    }, 1200);
  };

  const downloadComplianceReport = () => {
    const rows = [
      ["SahatGhar — Health Records Compliance Report"],
      ["Generated:", new Date().toLocaleString("en-PK")],
      [""],
      ["Metric", "Score", "Status"],
      ...COMPLIANCE_METRICS.map(m => [m.label, `${m.value}%`, m.status]),
      [""],
      ["Summary"],
      ["Total Compliant:", String(COMPLIANCE_METRICS.filter(m => m.status === "Compliant").length)],
      ["Total Requiring Review:", String(COMPLIANCE_METRICS.filter(m => m.status !== "Compliant").length)],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Compliance report downloaded" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Health Records & Compliance</h1>
            <p className="text-muted-foreground">Manage PHI access, retention, and privacy requests</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setComplianceOpen(true)}>
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Compliance Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">24.68 GB</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Access Events</p>
                <p className="text-2xl font-bold">3,842</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                <FileX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delete Requests</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === "Pending").length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-red-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flagged Records</p>
                <p className="text-2xl font-bold text-red-600">12</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Delete Request Queue</CardTitle>
            <CardDescription>Patient requests for data deletion (Right to be Forgotten)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Request Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Records Count</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{req.patient}</td>
                    <td className="px-4 py-3 text-muted-foreground">{req.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{req.reason}</td>
                    <td className="px-4 py-3 font-mono">{req.records}</td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "Pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setDeleteTarget(req)}
                        >
                          Process Deletion
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Process Deletion Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <FileX className="h-5 w-5" /> Confirm Data Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>You are about to permanently delete <strong>{deleteTarget?.records} health records</strong> for patient <strong>{deleteTarget?.patient}</strong>.</span>
              <span className="block text-amber-600 font-medium mt-2">⚠ This action is irreversible and complies with PDPA right-to-erasure requirements.</span>
              <span className="block text-muted-foreground text-xs mt-1">Reason: {deleteTarget?.reason}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleProcessDeletion}
              disabled={processing}
            >
              {processing ? "Processing..." : "Confirm & Delete Records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compliance Report Modal */}
      <Dialog open={complianceOpen} onOpenChange={setComplianceOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Compliance Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Generated: {new Date().toLocaleString("en-PK")}</span>
              <span className="font-medium text-emerald-600">
                {COMPLIANCE_METRICS.filter(m => m.status === "Compliant").length}/{COMPLIANCE_METRICS.length} Compliant
              </span>
            </div>
            <div className="space-y-3">
              {COMPLIANCE_METRICS.map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className={
                      m.status === "Compliant" ? "text-emerald-600 text-xs font-medium" :
                      m.status === "Partial" ? "text-amber-600 text-xs font-medium" :
                      "text-red-600 text-xs font-medium"
                    }>{m.value}% — {m.status}</span>
                  </div>
                  <Progress
                    value={m.value}
                    className={`h-2 ${m.status === "Compliant" ? "[&>div]:bg-emerald-500" : m.status === "Partial" ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplianceOpen(false)}>Close</Button>
            <Button className="gap-2" onClick={downloadComplianceReport}>
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
