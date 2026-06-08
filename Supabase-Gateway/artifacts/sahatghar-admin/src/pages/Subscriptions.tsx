import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListSubscriptions, useGetSubscriptionStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function Subscriptions() {
  const [showAll, setShowAll] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: stats } = useGetSubscriptionStats();
  const { data: subscriptionsList, isLoading } = useListSubscriptions();

  const filtered = React.useMemo(() => {
    const list = (subscriptionsList as any)?.data || subscriptionsList || [];
    if (!search) return list;
    return list.filter((s: any) =>
      s.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan?.toLowerCase().includes(search.toLowerCase())
    );
  }, [subscriptionsList, search]);

  const displayed = showAll ? filtered : filtered.slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground">Manage SaaS plans and subscribers</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</span>
              <span className="text-2xl font-bold text-emerald-600">PKR {((stats?.mrr || 0) / 1000000).toFixed(2)}M</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Active Subscribers</span>
              <span className="text-2xl font-bold">{stats?.active_subscribers?.toLocaleString() || 0}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Churn Rate</span>
              <span className="text-2xl font-bold text-red-600">{stats?.churn_rate || 0}%</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">Renewals This Month</span>
              <span className="text-2xl font-bold">{stats?.renewals_this_month?.toLocaleString() || 0}</span>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-2 shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>
                  Subscriber List
                  {search && <span className="text-sm font-normal text-muted-foreground ml-2">({filtered.length} results)</span>}
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search subscribers..."
                    className="pl-9 h-8"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Renewal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : displayed.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No subscribers found</td></tr>
                  ) : (
                    displayed.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-gray-900">{sub.patient_name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">PKR {sub.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                        <td className="px-4 py-3">
                          <span className={sub.days_until_renewal != null && sub.days_until_renewal < 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                            {sub.days_until_renewal != null ? `${sub.days_until_renewal} days` : "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!isLoading && filtered.length > 5 && (
                <div className="p-4 border-t text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowAll(v => !v)}
                  >
                    {showAll ? (
                      <><ChevronUp className="h-4 w-4" /> Show Less</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> View All {filtered.length} Subscribers</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>Active subscriptions by tier</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.plan_distribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="plan"
                    >
                      {(stats?.plan_distribution || []).map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full mt-2 space-y-1.5">
                {(stats?.plan_distribution || []).map((d: any, i: number) => (
                  <div key={d.plan} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{d.plan}</span>
                    </div>
                    <span className="font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
