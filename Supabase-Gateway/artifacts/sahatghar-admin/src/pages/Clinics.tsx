import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, MoreHorizontal, MapPin, Phone, Building2, Users, AlertCircle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-gray-100 text-gray-600 border-gray-200",
  SUSPENDED: "bg-red-100 text-red-700 border-red-200",
};

export default function Clinics() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", phone: "", address: "", city: "", area: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["clinics", status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      params.set("limit", "50");
      return (await fetch(`/api/clinics?${params}`)).json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Clinic created successfully" });
      queryClient.invalidateQueries({ queryKey: ["clinics"] });
      setAddOpen(false);
      setForm({ name: "", phone: "", address: "", city: "", area: "" });
    },
    onError: () => toast({ title: "Failed to create clinic", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: object }) => {
      const res = await fetch(`/api/clinics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Clinic updated" });
      queryClient.invalidateQueries({ queryKey: ["clinics"] });
      setEditTarget(null);
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/clinics/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Clinic removed" });
      queryClient.invalidateQueries({ queryKey: ["clinics"] });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const clinics = (data as any)?.data || data || [];
  const activeClinics = clinics.filter((c: any) => c.status === "ACTIVE").length;

  const ClinicForm = ({ initialData = form, onChange, onSubmit, isPending }: any) => (
    <div className="space-y-4">
      <div>
        <Label>Clinic Name *</Label>
        <Input className="mt-1" value={initialData.name} onChange={e => onChange({ ...initialData, name: e.target.value })} placeholder="e.g. City Medical Centre" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone</Label>
          <Input className="mt-1" value={initialData.phone} onChange={e => onChange({ ...initialData, phone: e.target.value })} placeholder="042-..." />
        </div>
        <div>
          <Label>City *</Label>
          <Input className="mt-1" value={initialData.city} onChange={e => onChange({ ...initialData, city: e.target.value })} placeholder="Lahore" />
        </div>
      </div>
      <div>
        <Label>Area</Label>
        <Input className="mt-1" value={initialData.area} onChange={e => onChange({ ...initialData, area: e.target.value })} placeholder="DHA, Gulberg..." />
      </div>
      <div>
        <Label>Address</Label>
        <Input className="mt-1" value={initialData.address} onChange={e => onChange({ ...initialData, address: e.target.value })} placeholder="Full address" />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => { setAddOpen(false); setEditTarget(null); }}>Cancel</Button>
        <Button onClick={() => onSubmit(initialData)} disabled={isPending || !initialData.name || !initialData.city}>
          {isPending ? "Saving..." : "Save Clinic"}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clinic Management</h1>
            <p className="text-muted-foreground">Manage partner clinics and their affiliations</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Clinic
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Clinics</p>
                <p className="text-2xl font-bold">{activeClinics}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Doctors</p>
                <p className="text-2xl font-bold">{clinics.reduce((s: number, c: any) => s + (c.doctors_count || 0), 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Cities Covered</p>
                <p className="text-2xl font-bold">{new Set(clinics.map((c: any) => c.city)).size}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search clinics..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clinic Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctors</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-muted w-24" /></td>)}
                    </tr>
                  ))
                ) : clinics.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No clinics found</td></tr>
                ) : (
                  clinics.map((c: any) => (
                    <tr key={c.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{c.area ? `${c.area}, ` : ""}{c.city}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />{c.phone || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{c.doctors_count || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] || ""}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setEditTarget(c); }}>Edit Clinic</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateMutation.mutate({ id: c.id, payload: { status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } })}
                            >
                              {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(c.id)}>Remove Clinic</DropdownMenuItem>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Clinic</DialogTitle></DialogHeader>
          <ClinicForm initialData={form} onChange={setForm} onSubmit={(d: any) => createMutation.mutate(d)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Clinic</DialogTitle></DialogHeader>
          {editTarget && (
            <ClinicForm
              initialData={editTarget}
              onChange={setEditTarget}
              onSubmit={(d: any) => updateMutation.mutate({ id: d.id, payload: d })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Clinic</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the clinic record. Doctors affiliated with this clinic will not be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
