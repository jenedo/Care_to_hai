import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAuditLogs, useGetAuditStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ShieldAlert, UserCheck, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";

export default function AuditLogs() {
  const [search, setSearch] = React.useState("");
  const { toast } = useToast();
  const { data: stats } = useGetAuditStats();
  const { data: logs, isLoading } = useListAuditLogs();

  const allLogs = React.useMemo(() => {
    return (logs as any)?.data || logs || [];
  }, [logs]);

  const filtered = React.useMemo(() => {
    if (!search) return allLogs;
    const q = search.toLowerCase();
    return allLogs.filter((l: any) =>
      l.admin_user?.toLowerCase().includes(q) ||
      l.action_type?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q) ||
      l.ip_address?.toLowerCase().includes(q)
    );
  }, [allLogs, search]);

  const exportCSV = () => {
    const headers = ["Timestamp", "Admin User", "Action Type", "Entity Type", "Entity ID", "IP Address", "Details"];
    const rows = allLogs.map((l: any) => [
      new Date(l.timestamp).toLocaleString("en-PK"),
      `"${l.admin_user || ""}"`,
      l.action_type || "",
      l.entity_type || "",
      l.entity_id || "",
      l.ip_address || "",
      `"${l.details || ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Audit trail exported", description: `${allLogs.length} log entries downloaded.` });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs & Security</h1>
            <p className="text-muted-foreground">System-wide immutable event logging and admin management</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={allLogs.length === 0}>
            <Download className="h-4 w-4" /> Export Audit Trail
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Admins</p>
                <p className="text-2xl font-bold">{stats?.active_admins || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspicious Events</p>
                <p className="text-2xl font-bold">{stats?.suspicious_events || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Locked Accounts</p>
                <p className="text-2xl font-bold">{stats?.locked_accounts || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Log Entries</p>
                <p className="text-2xl font-bold">{allLogs.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <Tabs defaultValue="events" className="w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="events">Audit Event Logs</TabsTrigger>
                <TabsTrigger value="roles">Admin Roles</TabsTrigger>
                <TabsTrigger value="accounts">Admin Accounts</TabsTrigger>
                <TabsTrigger value="failed">Failed Logins</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="events" className="m-0">
              <div className="p-4 border-b bg-muted/20 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, action, IP..."
                    className="pl-9 bg-white"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {search && (
                  <span className="text-sm text-muted-foreground">{filtered.length} results</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Admin User</th>
                      <th className="px-4 py-3">Action Type</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-muted w-24" /></td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {search ? "No matching log entries" : "No audit logs found"}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                            {new Date(log.timestamp).toLocaleString("en-PK")}
                          </td>
                          <td className="px-4 py-3 font-medium">{log.admin_user}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={log.action_type} className="bg-gray-100 text-gray-800" />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {log.entity_type} {log.entity_id ? `(${String(log.entity_id).substring(0, 8)})` : ""}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip_address}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Permissions</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { role: "Super Admin", permissions: "Full Access", users: 1 },
                      { role: "Operations Admin", permissions: "Doctors, Patients, Appointments", users: 3 },
                      { role: "Finance Admin", permissions: "Payments, Subscriptions", users: 2 },
                      { role: "Support Agent", permissions: "Support Tickets (read/write)", users: 5 },
                      { role: "Audit Viewer", permissions: "Audit Logs (read-only)", users: 1 },
                    ].map(r => (
                      <tr key={r.role} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{r.role}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{r.permissions}</td>
                        <td className="px-4 py-3">{r.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admin</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { name: "Admin SahatGhar", email: "admin@sahatghar.pk", role: "Super Admin", login: "Just now", status: "active" },
                      { name: "Bilal Ahmed", email: "bilal@sahatghar.pk", role: "Operations Admin", login: "2 hours ago", status: "active" },
                      { name: "Sara Khan", email: "sara@sahatghar.pk", role: "Finance Admin", login: "Yesterday", status: "active" },
                      { name: "Usman Javed", email: "usman@sahatghar.pk", role: "Support Agent", login: "3 days ago", status: "active" },
                    ].map(a => (
                      <tr key={a.email} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{a.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{a.email}</td>
                        <td className="px-4 py-3 text-xs">{a.role}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{a.login}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="failed" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email Attempted</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { ts: "2025-05-22 09:14:22", email: "admin@sahatghar.pk", ip: "123.45.67.89", reason: "Wrong password" },
                      { ts: "2025-05-22 08:52:11", email: "billing@sahatghar.pk", ip: "192.168.1.5", reason: "Account not found" },
                      { ts: "2025-05-21 22:31:04", email: "admin@sahatghar.pk", ip: "45.12.88.200", reason: "Wrong password (3rd attempt — locked)" },
                    ].map((f, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{f.ts}</td>
                        <td className="px-4 py-3 text-xs">{f.email}</td>
                        <td className="px-4 py-3 font-mono text-xs">{f.ip}</td>
                        <td className="px-4 py-3 text-xs text-red-600">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
}
