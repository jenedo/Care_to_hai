import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Eye, EyeOff, CheckCircle2, AlertTriangle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  PUBLISHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HIDDEN: "bg-gray-100 text-gray-600 border-gray-200",
  REPORTED: "bg-red-100 text-red-700 border-red-200",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}.0</span>
    </div>
  );
}

export default function Reviews() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [actionTarget, setActionTarget] = React.useState<{ id: string; action: "publish" | "hide" } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      params.set("limit", "50");
      return (await fetch(`/api/reviews?${params}`)).json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["reviews-stats"],
    queryFn: async () => (await fetch("/api/reviews/stats")).json(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: object }) => {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (_, { payload }: any) => {
      const s = (payload as any).status;
      toast({ title: s === "PUBLISHED" ? "Review published" : "Review hidden", description: "Review status updated." });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviews-stats"] });
      setActionTarget(null);
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const reviews = (data as any)?.data || data || [];
  const stats = statsData || {};
  const filtered = reviews.filter((r: any) => {
    if (!search) return true;
    return r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.comment?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Moderation</h1>
          <p className="text-muted-foreground">Manage and moderate patient reviews</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: stats.pending ?? 0, color: "border-l-amber-500" },
            { label: "Published", value: stats.published ?? 0, color: "border-l-emerald-500" },
            { label: "Reported", value: stats.reported ?? 0, color: "border-l-red-500" },
            { label: "Avg Rating", value: stats.avg_rating ? `${stats.avg_rating} ★` : "—", color: "border-l-yellow-500" },
          ].map(({ label, value, color }) => (
            <Card key={label} className={`shadow-sm border-l-4 ${color}`}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search reviews..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="HIDDEN">Hidden</SelectItem>
                <SelectItem value="REPORTED">Reported</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comment</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
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
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No reviews found</td></tr>
                ) : (
                  filtered.map((r: any) => (
                    <tr key={r.id} className={`border-b hover:bg-muted/20 transition-colors ${r.status === "REPORTED" ? "bg-red-50/50" : ""}`}>
                      <td className="px-4 py-3 font-medium">{r.patient_name}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{r.doctor_name}</p>
                          <p className="text-xs text-muted-foreground">{r.doctor_specialty}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
                      <td className="px-4 py-3 max-w-64">
                        <p className="text-sm truncate" title={r.comment}>{r.comment}</p>
                        {r.report_reason && (
                          <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {r.report_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-PK")}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {r.status !== "PUBLISHED" && (
                              <DropdownMenuItem className="text-emerald-600" onClick={() => setActionTarget({ id: r.id, action: "publish" })}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Publish
                              </DropdownMenuItem>
                            )}
                            {r.status !== "HIDDEN" && (
                              <DropdownMenuItem className="text-gray-600" onClick={() => setActionTarget({ id: r.id, action: "hide" })}>
                                <EyeOff className="h-4 w-4 mr-2" /> Hide
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

      <AlertDialog open={!!actionTarget} onOpenChange={open => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionTarget?.action === "publish" ? "Publish Review" : "Hide Review"}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "publish"
                ? "This review will be visible to all users on the platform."
                : "This review will be hidden from public display."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionTarget && updateMutation.mutate({
                id: actionTarget.id,
                payload: { status: actionTarget.action === "publish" ? "PUBLISHED" : "HIDDEN" }
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
