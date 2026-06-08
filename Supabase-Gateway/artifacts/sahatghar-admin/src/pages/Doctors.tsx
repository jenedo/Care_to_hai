import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListDoctors,
  useGetDoctorStats,
  useUpdateDoctorStatus,
  useCreateDoctor,
  getListDoctorsQueryKey,
  getGetDoctorStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Filter, MoreHorizontal, Eye, Check, X, ShieldAlert, UserPlus } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Doctors() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", specialty: "", city: "", pmdc_number: "", phone: "", fee: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetDoctorStats();
  const { data: doctorsList, isLoading } = useListDoctors({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
  });

  const updateStatus = useUpdateDoctorStatus({
    mutation: {
      onSuccess: (_, vars) => {
        const action = (vars.data as any).status === "verified" ? "approved" :
                       (vars.data as any).status === "suspended" ? "suspended" : "rejected";
        toast({ title: `Doctor ${action}`, description: "Status has been updated." });
        queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDoctorStatsQueryKey() });
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    },
  });

  const createDoctor = useCreateDoctor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Doctor added", description: "New doctor has been added successfully." });
        queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDoctorStatsQueryKey() });
        setAddOpen(false);
        setForm({ name: "", specialty: "", city: "", pmdc_number: "", phone: "", fee: "" });
      },
      onError: () => toast({ title: "Failed to add doctor", variant: "destructive" }),
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createDoctor.mutate({
      data: {
        name: form.name,
        specialty: form.specialty,
        city: form.city,
        pmdc_number: form.pmdc_number,
        phone: form.phone,
        fee: Number(form.fee),
        status: "pending",
      } as any,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Doctor Management</h1>
            <p className="text-muted-foreground">Manage and verify healthcare providers</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Doctor
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Total Doctors</span>
              <span className="text-2xl font-bold">{stats?.total || 0}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Verified</span>
              <span className="text-2xl font-bold">{stats?.verified || 0}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Pending Approval</span>
              <span className="text-2xl font-bold">{stats?.pending || 0}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Suspended</span>
              <span className="text-2xl font-bold">{stats?.suspended || 0}</span>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Advanced Filters
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Specialty</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">PMDC #</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading doctors...</td>
                  </tr>
                ) : doctorsList?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No doctors found</td>
                  </tr>
                ) : (
                  doctorsList?.data.map((doctor) => (
                    <tr key={doctor.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{doctor.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doctor.specialty}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doctor.city}</td>
                      <td className="px-4 py-3 font-mono text-xs">{doctor.pmdc_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(doctor.joined_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doctor.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/doctors/${doctor.id}`} className="flex items-center gap-2 cursor-pointer w-full">
                                <Eye className="h-4 w-4" /> View Profile
                              </Link>
                            </DropdownMenuItem>
                            {(doctor.status === 'pending' || doctor.status === 'rejected') && (
                              <DropdownMenuItem
                                className="text-emerald-600 focus:text-emerald-600 flex items-center gap-2 cursor-pointer"
                                onClick={() => updateStatus.mutate({ id: doctor.id, data: { status: 'verified' } })}
                                disabled={updateStatus.isPending}
                              >
                                <Check className="h-4 w-4" /> Approve
                              </DropdownMenuItem>
                            )}
                            {doctor.status === 'pending' && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 flex items-center gap-2 cursor-pointer"
                                onClick={() => updateStatus.mutate({ id: doctor.id, data: { status: 'rejected', reason: 'Verification failed' } })}
                                disabled={updateStatus.isPending}
                              >
                                <X className="h-4 w-4" /> Reject
                              </DropdownMenuItem>
                            )}
                            {doctor.status === 'verified' && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 flex items-center gap-2 cursor-pointer"
                                onClick={() => updateStatus.mutate({ id: doctor.id, data: { status: 'suspended', reason: 'Administrative action' } })}
                                disabled={updateStatus.isPending}
                              >
                                <ShieldAlert className="h-4 w-4" /> Suspend
                              </DropdownMenuItem>
                            )}
                            {doctor.status === 'suspended' && (
                              <DropdownMenuItem
                                className="text-emerald-600 focus:text-emerald-600 flex items-center gap-2 cursor-pointer"
                                onClick={() => updateStatus.mutate({ id: doctor.id, data: { status: 'verified' } })}
                                disabled={updateStatus.isPending}
                              >
                                <Check className="h-4 w-4" /> Reinstate
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
          <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <div>Showing {doctorsList?.data.length || 0} of {doctorsList?.total || 0} results</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>Fill in the doctor's details. They'll be added with Pending status for verification.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" placeholder="Dr. Ahmad Ali" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="specialty">Specialty *</Label>
                  <Input id="specialty" placeholder="Cardiology" required value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" placeholder="Lahore" required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pmdc">PMDC Number *</Label>
                  <Input id="pmdc" placeholder="12345-P" required value={form.pmdc_number} onChange={e => setForm(f => ({ ...f, pmdc_number: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="0300-1234567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fee">Consultation Fee (PKR)</Label>
                  <Input id="fee" type="number" placeholder="1500" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createDoctor.isPending}>
                {createDoctor.isPending ? "Adding..." : "Add Doctor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
