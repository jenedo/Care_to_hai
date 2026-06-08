import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListPatients, useTogglePatientBlock } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Filter, MoreHorizontal, Eye, Ban, Unlock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListPatientsQueryKey } from "@workspace/api-client-react";

export default function Patients() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patientsList, isLoading } = useListPatients({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
  });

  const toggleBlock = useTogglePatientBlock({
    mutation: {
      onSuccess: (_, vars) => {
        const action = (vars.data as any).blocked ? "blocked" : "unblocked";
        toast({ title: `Patient ${action}`, description: "Patient status has been updated." });
        queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    },
  });

  const isBlocked = (s: string) => s === "blocked" || s === "Blocked";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Patient Management</h1>
            <p className="text-muted-foreground">Manage patients, families, and access</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Total Bookings</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading patients...</td>
                  </tr>
                ) : patientsList?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No patients found</td>
                  </tr>
                ) : (
                  patientsList?.data.map((patient) => (
                    <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {patient.name.charAt(0)}
                        </div>
                        {patient.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{patient.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{patient.city}</td>
                      <td className="px-4 py-3 font-medium">{patient.total_bookings || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(patient.joined_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={patient.status} />
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
                              <Link href={`/patients/${patient.id}`} className="flex items-center gap-2 cursor-pointer w-full">
                                <Eye className="h-4 w-4" /> View Profile
                              </Link>
                            </DropdownMenuItem>
                            {!isBlocked(patient.status) ? (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 flex items-center gap-2 cursor-pointer"
                                onClick={() => toggleBlock.mutate({ id: patient.id, data: { blocked: true, reason: "Admin blocked" } })}
                                disabled={toggleBlock.isPending}
                              >
                                <Ban className="h-4 w-4" /> Block Patient
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-emerald-600 focus:text-emerald-600 flex items-center gap-2 cursor-pointer"
                                onClick={() => toggleBlock.mutate({ id: patient.id, data: { blocked: false, reason: "Admin unblocked" } })}
                                disabled={toggleBlock.isPending}
                              >
                                <Unlock className="h-4 w-4" /> Unblock Patient
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
            <div>Showing {patientsList?.data.length || 0} of {patientsList?.total || 0} results</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
