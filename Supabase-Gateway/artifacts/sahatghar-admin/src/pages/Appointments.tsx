import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListAppointments,
  useGetAppointmentStats,
  useUpdateAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, MoreHorizontal, Eye, XCircle, CheckCircle2, VideoIcon, PhoneCall, Calendar, User, Stethoscope, CreditCard, StickyNote } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export default function Appointments() {
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [detailTarget, setDetailTarget] = React.useState<any | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetAppointmentStats();
  const { data: appointmentList, isLoading } = useListAppointments({
    status: status !== "all" ? status : undefined,
  });

  const updateAppt = useUpdateAppointment({
    mutation: {
      onSuccess: (_, vars) => {
        const s = (vars.data as any).status;
        toast({ title: `Appointment ${s}`, description: "The appointment has been updated." });
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        setCancelTarget(null);
        setDetailTarget(null);
      },
      onError: () => {
        toast({ title: "Action failed", variant: "destructive" });
      },
    },
  });

  const filtered = React.useMemo(() => {
    const list = (appointmentList as any)?.data || appointmentList || [];
    return list.filter((a: any) => {
      if (!search) return true;
      return (
        a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.doctor_name?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [appointmentList, search]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Monitor and manage all consultations</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Attended</p>
              <p className="text-2xl font-bold">{stats?.attended || 0}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold">{stats?.cancelled || 0}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">No-shows</p>
              <p className="text-2xl font-bold">{stats?.no_show || 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient or doctor..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 rounded bg-muted w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No appointments found</td>
                  </tr>
                ) : (
                  filtered.map((a: any) => (
                    <tr key={a.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{a.patient_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.doctor_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs">
                          {a.type?.toLowerCase().includes("video") ? <VideoIcon className="h-3 w-3 text-blue-500" /> : <PhoneCall className="h-3 w-3 text-green-500" />}
                          {a.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(a.date_time || a.scheduled_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
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
                            <DropdownMenuItem onClick={() => setDetailTarget(a)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {a.status !== "completed" && a.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => updateAppt.mutate({ id: a.id, data: { status: "completed" } })}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Mark Completed
                              </DropdownMenuItem>
                            )}
                            {a.status !== "cancelled" && a.status !== "completed" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setCancelTarget(a.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Cancel Appointment
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

      {/* View Details Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={open => !open && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">{detailTarget.id}</span>
                <StatusBadge status={detailTarget.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Patient</p>
                    <p className="font-medium">{detailTarget.patient_name}</p>
                    {detailTarget.patient_age && <p className="text-xs text-muted-foreground">{detailTarget.patient_age}y • {detailTarget.patient_gender}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Stethoscope className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Doctor</p>
                    <p className="font-medium">{detailTarget.doctor_name}</p>
                    {detailTarget.doctor_specialty && <p className="text-xs text-muted-foreground">{detailTarget.doctor_specialty}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Date & Time</p>
                    <p className="font-medium">
                      {new Date(detailTarget.date_time || detailTarget.scheduled_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {detailTarget.type?.toLowerCase().includes("video") ? <VideoIcon className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" /> : <PhoneCall className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />}
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium">{detailTarget.type}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    <p className="font-medium">PKR {(detailTarget.amount || 0).toLocaleString()}</p>
                    {detailTarget.payment_status && <Badge variant="outline" className="mt-0.5 text-xs">{detailTarget.payment_status}</Badge>}
                  </div>
                </div>
                {detailTarget.city && (
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">City</p>
                      <p className="font-medium">{detailTarget.city}</p>
                    </div>
                  </div>
                )}
              </div>
              {detailTarget.notes && (
                <div className="flex items-start gap-2 bg-muted/40 rounded-md p-3">
                  <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="text-sm">{detailTarget.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailTarget?.status !== "completed" && detailTarget?.status !== "cancelled" && (
              <>
                <Button
                  variant="outline"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => updateAppt.mutate({ id: detailTarget.id, data: { status: "completed" } })}
                  disabled={updateAppt.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Completed
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-red-200 hover:bg-red-50"
                  onClick={() => { setDetailTarget(null); setCancelTarget(detailTarget.id); }}
                  disabled={updateAppt.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setDetailTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? The patient and doctor will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelTarget && updateAppt.mutate({ id: cancelTarget, data: { status: "cancelled" } })}
              disabled={updateAppt.isPending}
            >
              {updateAppt.isPending ? "Cancelling..." : "Cancel Appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
