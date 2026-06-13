import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageSquare, Video, Phone, Clock, User, Eye, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CHAT: { label: "Chat", color: "bg-blue-100 text-blue-700", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  VIDEO: { label: "Video", color: "bg-purple-100 text-purple-700", icon: <Video className="h-3.5 w-3.5" /> },
  AUDIO: { label: "Audio", color: "bg-green-100 text-green-700", icon: <Phone className="h-3.5 w-3.5" /> },
};

const STATUS_CONFIG: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ABANDONED: "bg-gray-100 text-gray-600",
  TIMED_OUT: "bg-orange-100 text-orange-700",
};

function formatDuration(seconds: number) {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

export default function Sessions() {
  const [search, setSearch] = useState("");
  const [viewSession, setViewSession] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["consultations"],
    queryFn: async () => {
      const res = await fetch("/api/consultations", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["consultation-detail", viewSession?.id],
    queryFn: async () => {
      const res = await fetch(`/api/consultations/${viewSession.id}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!viewSession,
  });

  const sessions: any[] = Array.isArray(data?.data) ? data.data : [];

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.patientName?.toLowerCase().includes(q) ||
      s.doctorName?.toLowerCase().includes(q) ||
      s.id?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === "ACTIVE").length,
    completed: sessions.filter(s => s.status === "COMPLETED").length,
    paid: sessions.filter(s => s.isPaid).length,
  };

  const detail = detailData?.data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Consultation Monitoring
            </h1>
            <p className="text-muted-foreground mt-1">Monitor all patient-doctor sessions in real-time for safety</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Sessions", value: stats.total, color: "border-l-blue-500" },
            { label: "Active Now", value: stats.active, color: "border-l-emerald-500" },
            { label: "Completed", value: stats.completed, color: "border-l-purple-500" },
            { label: "Paid Sessions", value: stats.paid, color: "border-l-amber-500" },
          ].map(s => (
            <Card key={s.label} className={`shadow-sm border-l-4 ${s.color}`}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm">
          <div className="p-4 border-b flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, doctor, or session ID…"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Type", "Patient", "Doctor", "Status", "Trial", "Duration", "Started", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading sessions…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No sessions found</td></tr>
                ) : filtered.map(session => {
                  const typeConf = TYPE_CONFIG[session.type] ?? TYPE_CONFIG.CHAT;
                  return (
                    <tr key={session.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${typeConf.color}`}>
                          {typeConf.icon} {typeConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{session.patientName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{session.doctorName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[session.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {session.isFreeTrial ? (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Free</span>
                        ) : session.isPaid ? (
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Paid</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Plan</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(session.durationSeconds)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatTime(session.startedAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setViewSession(session)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={!!viewSession} onOpenChange={open => !open && setViewSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Session Transcript
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
          ) : detail ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-muted/30 rounded-lg p-3 text-sm">
                <div><span className="text-muted-foreground">Type</span><br /><strong>{detail.type}</strong></div>
                <div><span className="text-muted-foreground">Status</span><br /><strong>{detail.status}</strong></div>
                <div><span className="text-muted-foreground">Duration</span><br /><strong>{formatDuration(detail.durationSeconds)}</strong></div>
                <div><span className="text-muted-foreground">Patient</span><br /><strong>{viewSession?.patientName ?? "—"}</strong></div>
                <div><span className="text-muted-foreground">Doctor</span><br /><strong>{viewSession?.doctorName ?? "—"}</strong></div>
                <div><span className="text-muted-foreground">Payment</span><br /><strong>{detail.isPaid ? `Rs. ${detail.paymentAmount}` : detail.isFreeTrial ? "Free Trial" : "Plan"}</strong></div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Chat Transcript
                  <span className="text-xs font-normal text-muted-foreground">({detail.messages?.length ?? 0} messages) — recorded for safety</span>
                </h3>
                {!detail.messages?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No messages in this session</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {detail.messages.map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.senderRole === "DOCTOR" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.senderRole === "DOCTOR"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          <div className="text-xs opacity-60 mb-1 font-medium">
                            {msg.senderRole === "DOCTOR" ? "Dr." : ""} {msg.senderName ?? msg.senderRole}
                          </div>
                          {msg.content}
                          <div className="text-xs opacity-50 mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
