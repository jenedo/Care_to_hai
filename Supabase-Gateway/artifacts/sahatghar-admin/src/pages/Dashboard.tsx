import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  useGetDashboardStats,
  useGetDashboardActivity,
  useGetRevenueTrend,
  useGetVerificationQueue,
  useUpdateDoctorStatus,
  getGetDashboardStatsQueryKey,
  getGetVerificationQueueQueryKey,
  getListDoctorsQueryKey,
} from "@workspace/api-client-react";
import { Users, UserRound, Calendar, CreditCard, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#F59E0B", "#10B981", "#6366F1", "#EF4444", "#8B5CF6"];

function formatPKR(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(val);
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity();
  const { data: revenue, isLoading: revenueLoading } = useGetRevenueTrend();
  const { data: queue, isLoading: queueLoading } = useGetVerificationQueue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useUpdateDoctorStatus({
    mutation: {
      onSuccess: (_, vars) => {
        const action = vars.data.status === "verified" ? "approved" : "rejected";
        toast({ title: `Doctor ${action} successfully`, description: "Verification queue updated." });
        queryClient.invalidateQueries({ queryKey: getGetVerificationQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
      },
      onError: () => {
        toast({ title: "Action failed", description: "Could not update doctor status.", variant: "destructive" });
      },
    },
  });

  const appointmentData = [
    { name: "Pending", value: 742 },
    { name: "Completed", value: 888 },
    { name: "Confirmed", value: 1894 },
    { name: "Cancelled", value: 318 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time overview of SahatGhar operations</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live data
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={statsLoading ? "—" : (stats?.total_users?.toLocaleString() || "0")}
            change={stats?.total_users_change || 0}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Verified Doctors"
            value={statsLoading ? "—" : (stats?.verified_doctors?.toLocaleString() || "0")}
            change={stats?.verified_doctors_change || 0}
            icon={<UserRound className="h-4 w-4" />}
          />
          <StatCard
            title="Today's Appointments"
            value={statsLoading ? "—" : (stats?.todays_appointments?.toLocaleString() || "0")}
            change={stats?.todays_appointments_change || 0}
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatCard
            title="Monthly Revenue"
            value={statsLoading ? "—" : `PKR ${formatPKR(stats?.monthly_revenue || 0)}`}
            change={stats?.monthly_revenue_change || 0}
            icon={<CreditCard className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          {/* Revenue Trend */}
          <Card className="col-span-4 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
                <CardDescription>Last 30 days (PKR)</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-[280px] pt-0">
              {revenueLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue || []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatPKR} width={48} />
                    <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Appointment Status Donut */}
          <Card className="col-span-3 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Appointment Status</CardTitle>
              <CardDescription>Current month distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {appointmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), "Appointments"]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Verification Queue */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Verification Queue</CardTitle>
                <CardDescription>
                  {stats?.pending_approvals || 0} doctor{(stats?.pending_approvals || 0) !== 1 ? "s" : ""} pending approval
                </CardDescription>
              </div>
              <Link href="/doctors">
                <Button variant="outline" size="sm" className="text-xs h-7">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 rounded bg-muted" />
                        <div className="h-2.5 w-20 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : queue && queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                          {doc.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialty} · {doc.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-amber-600 border-amber-200 bg-amber-50">
                          Pending
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => updateStatus.mutate({ id: doc.id, data: { status: "verified" } })}
                          disabled={updateStatus.isPending}
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => updateStatus.mutate({ id: doc.id, data: { status: "rejected" } })}
                          disabled={updateStatus.isPending}
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                  No pending verifications
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <CardDescription>Admin actions in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="mt-1 h-2 w-2 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-48 rounded bg-muted" />
                        <div className="h-2.5 w-24 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.map(item => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="leading-snug text-sm">
                          <span className="font-medium">{item.user}</span>
                          {" "}{item.action}{" "}
                          <span className="font-medium">{item.entity}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.timestamp).toLocaleString("en-PK", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">No recent activity</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
