import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Shield, User, UserX, UserCheck, Key } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ROLE_COLORS: Record<string, string> = {
  "Super Admin": "bg-purple-100 text-purple-700 border-purple-200",
  "Admin": "bg-blue-100 text-blue-700 border-blue-200",
  "Finance": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Doctor Verifier": "bg-amber-100 text-amber-700 border-amber-200",
  "Support": "bg-gray-100 text-gray-700 border-gray-200",
  "SUPER_ADMIN": "bg-purple-100 text-purple-700 border-purple-200",
  "ADMIN": "bg-blue-100 text-blue-700 border-blue-200",
  "FINANCE": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "VERIFICATION_OFFICER": "bg-amber-100 text-amber-700 border-amber-200",
  "SUPPORT": "bg-gray-100 text-gray-700 border-gray-200",
};

const ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE", "VERIFICATION_OFFICER", "SUPPORT"];

export default function AdminUsers() {
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<{ id: string; current: string } | null>(null);
  const [form, setForm] = React.useState({ name: "", email: "", role: "SUPPORT" });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await fetch("/api/admin-users")).json(),
  });

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Admin user created" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAddOpen(false);
      setForm({ name: "", email: "", role: "SUPPORT" });
    },
    onError: () => toast({ title: "Failed to create user", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin-users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setStatusTarget(null);
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const users = Array.isArray(adminUsers) ? adminUsers : (adminUsers as any)?.data || [];
  const filtered = users.filter((u: any) =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const active = users.filter((u: any) => u.status === "active").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin User Management</h1>
            <p className="text-muted-foreground">Manage admin accounts, roles, and permissions</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Admin User
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Admins</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{active}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center gap-3">
              <UserX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold">{users.length - active}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admin</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Active</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Failed Logins</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-muted w-20" /></td>)}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No admin users found</td></tr>
                ) : (
                  filtered.map((u: any) => (
                    <tr key={u.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                            {(u.name || u.email || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-700"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${u.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.last_active ? new Date(u.last_active).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" }) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${u.failed_attempts > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {u.failed_attempts}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {u.status === "active" ? (
                              <DropdownMenuItem className="text-red-600" onClick={() => setStatusTarget({ id: u.id, current: "active" })}>
                                <UserX className="h-4 w-4 mr-2" /> Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-emerald-600" onClick={() => setStatusTarget({ id: u.id, current: "suspended" })}>
                                <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Key className="h-4 w-4 mr-2" /> Reset Password
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Admin User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@sahatghar.pk" />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.email}>
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!statusTarget} onOpenChange={open => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTarget?.current === "active" ? "Suspend Admin User" : "Reactivate Admin User"}</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.current === "active"
                ? "This admin will lose access to the platform immediately."
                : "This admin will regain platform access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={statusTarget?.current === "active" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => statusTarget && statusMutation.mutate({
                id: statusTarget.id,
                status: statusTarget.current === "active" ? "suspended" : "active",
              })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? "Processing..." : statusTarget?.current === "active" ? "Suspend" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
