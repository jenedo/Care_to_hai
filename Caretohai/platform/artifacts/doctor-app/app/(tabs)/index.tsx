import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetAppointmentStats,
  useListAppointments,
  useUpdateAppointment,
  getListAppointmentsQueryKey,
} from "@asaancare/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { AppointmentCard, type AppointmentItem } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { StatsCard } from "@/components/StatsCard";
import { router } from "expo-router";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://e49dbd72-fb3e-415a-b072-c57379e5cb99-00-1c5axkjqm47hq.pike.replit.dev";

const STATUS_OPTIONS = [
  { key: "ONLINE", label: "Online", color: "#22C55E", icon: "wifi" as const },
  { key: "BUSY", label: "Busy", color: "#F59E0B", icon: "clock" as const },
  { key: "OFFLINE", label: "Offline", color: "#94A3B8", icon: "wifi-off" as const },
];

type ConsultRequest = {
  id: string;
  type: string;
  message?: string;
  status: string;
  createdAt: string;
  patientId: string;
  patientName?: string;
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor, token } = useAuth();
  const queryClient = useQueryClient();

  const [onlineStatus, setOnlineStatus] = useState<"ONLINE" | "BUSY" | "OFFLINE">("OFFLINE");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [consultRequests, setConsultRequests] = useState<ConsultRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const { data: aptData, isLoading: loadingApts, refetch } = useListAppointments({
    doctor_id: doctor?.id,
    limit: 50,
  });
  const { data: stats } = useGetAppointmentStats();

  const updateApt = useUpdateAppointment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }),
    },
  });

  const appointments = useMemo<AppointmentItem[]>(() => {
    const raw = (aptData as any)?.data ?? aptData ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [aptData]);

  const pending = useMemo(() => appointments.filter((a) => a.status === "pending"), [appointments]);
  const todayApts = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter((a) => {
      const dt = a.date_time ?? (a as any).scheduled_at;
      return dt && new Date(dt).toDateString() === today;
    });
  }, [appointments]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => {
        const dt = a.date_time ?? (a as any).scheduled_at;
        return (a.status === "confirmed" || a.status === "pending") && dt && new Date(dt) >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date_time ?? (a as any).scheduled_at ?? 0).getTime();
        const db = new Date(b.date_time ?? (b as any).scheduled_at ?? 0).getTime();
        return da - db;
      })
      .slice(0, 3);
  }, [appointments]);

  const totalEarnings = useMemo(() => {
    return appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.fee ?? 0), 0);
  }, [appointments]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultation-requests/doctor`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConsultRequests(data?.data ?? []);
      }
    } catch {}
    setLoadingRequests(false);
  }, [token, authHeaders]);

  const fetchEarnings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/doctor/earnings`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAvailableBalance(data?.data?.available_balance ?? 0);
        setRating(data?.data?.rating ?? null);
        setTodayEarnings(data?.data?.today ?? 0);
      }
    } catch {}
  }, [token, authHeaders]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const updateStatus = useCallback(async (status: "ONLINE" | "BUSY" | "OFFLINE") => {
    if (!token) return;
    setUpdatingStatus(true);
    try {
      await fetch(`${API_BASE}/api/doctor/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ status }),
      });
      setOnlineStatus(status);
      if (status === "ONLINE") {
        await fetchRequests();
      }
    } catch {}
    setUpdatingStatus(false);
  }, [token, authHeaders, fetchRequests]);

  // Heartbeat every 45s when online
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (onlineStatus === "ONLINE" && token) {
      heartbeatRef.current = setInterval(async () => {
        try {
          await fetch(`${API_BASE}/api/doctor/heartbeat`, { method: "POST", headers: authHeaders });
        } catch {}
      }, 45000);
    }
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [onlineStatus, token, authHeaders]);

  // Poll requests when online
  useEffect(() => {
    if (onlineStatus !== "ONLINE" || !token) return;
    const iv = setInterval(fetchRequests, 30000);
    return () => clearInterval(iv);
  }, [onlineStatus, token, fetchRequests]);

  const handleAcceptRequest = async (req: ConsultRequest) => {
    setRespondingId(req.id);
    try {
      const res = await fetch(`${API_BASE}/api/consultation-requests/${req.id}/accept`, {
        method: "PATCH",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data?.data?.session?.id) {
        setConsultRequests(prev => prev.filter(r => r.id !== req.id));
        router.push(`/consult/${data.data.session.id}`);
      } else {
        Alert.alert("Error", data?.error ?? "Could not accept request.");
      }
    } catch {
      Alert.alert("Error", "Network error.");
    }
    setRespondingId(null);
  };

  const handleDeclineRequest = async (req: ConsultRequest) => {
    Alert.alert(
      "Decline Request",
      `Decline ${req.patientName ?? "this patient"}'s request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline", style: "destructive",
          onPress: async () => {
            setRespondingId(req.id);
            try {
              await fetch(`${API_BASE}/api/consultation-requests/${req.id}/decline`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ reason: "Doctor unavailable" }),
              });
              setConsultRequests(prev => prev.filter(r => r.id !== req.id));
            } catch {}
            setRespondingId(null);
          }
        }
      ]
    );
  };

  const handleAcceptApt = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "confirmed" } });
  };
  const handleDeclineApt = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "cancelled" } });
  };
  const handleComplete = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "completed" } });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const currentStatusOption = STATUS_OPTIONS.find(s => s.key === onlineStatus) ?? STATUS_OPTIONS[2];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loadingApts}
          onRefresh={() => { refetch(); fetchRequests(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.doctorName} numberOfLines={1}>
              {doctor?.fullName ?? "Doctor"}
            </Text>
            <View style={styles.specialtyRow}>
              <Text style={styles.specialty}>{doctor?.specialty ?? ""}</Text>
              {rating != null && (
                <View style={styles.ratingBadge}>
                  <Feather name="star" size={10} color="#F59E0B" />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.8}
          >
            <Feather name="bell" size={20} color="#ffffff" />
            {consultRequests.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>{consultRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Online Status Selector */}
        <View style={styles.statusSelector}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.statusOption,
                onlineStatus === opt.key && { backgroundColor: opt.color + "30", borderColor: opt.color },
              ]}
              onPress={() => !updatingStatus && updateStatus(opt.key as any)}
              activeOpacity={0.8}
              disabled={updatingStatus}
            >
              {updatingStatus && onlineStatus === opt.key ? (
                <ActivityIndicator size="small" color={opt.color} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
              )}
              <Text style={[styles.statusOptionText, { color: onlineStatus === opt.key ? opt.color : "rgba(255,255,255,0.6)" }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statVal}>{todayApts.length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statVal}>{pending.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statVal}>
              {todayEarnings != null ? `PKR ${todayEarnings > 999 ? (todayEarnings / 1000).toFixed(1) + "K" : todayEarnings}` : "—"}
            </Text>
            <Text style={styles.statLabel}>Today Earn</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statVal}>
              {availableBalance != null ? `PKR ${availableBalance > 999 ? (availableBalance / 1000).toFixed(1) + "K" : availableBalance}` : "—"}
            </Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatsCard
            label="Total Appointments"
            value={appointments.length}
            icon={<Feather name="calendar" size={18} color={colors.primary} />}
          />
          <StatsCard
            label="Completed"
            value={appointments.filter((a) => a.status === "completed").length}
            accent={colors.success}
            icon={<Feather name="check-circle" size={18} color={colors.success} />}
          />
        </View>

        {/* Consultation Requests from Patients */}
        {consultRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Patient Requests
              </Text>
              <View style={[styles.countBadge, { backgroundColor: "#EF444422" }]}>
                <Text style={[styles.countText, { color: "#EF4444" }]}>{consultRequests.length}</Text>
              </View>
            </View>
            {loadingRequests ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            ) : (
              consultRequests.map(req => (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.requestTop}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestAvatarText}>
                        {(req.patientName ?? "P").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={[styles.requestName, { color: colors.foreground }]}>
                        {req.patientName ?? "Patient"}
                      </Text>
                      <View style={styles.requestMeta}>
                        <Feather
                          name={req.type === "VIDEO" ? "video" : req.type === "AUDIO" ? "phone" : "message-circle"}
                          size={12}
                          color={colors.mutedForeground}
                        />
                        <Text style={[styles.requestMetaText, { color: colors.mutedForeground }]}>
                          {" "}{req.type} · {new Date(req.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {req.message ? (
                    <Text style={[styles.requestMsg, { color: colors.mutedForeground }]} numberOfLines={2}>
                      "{req.message}"
                    </Text>
                  ) : null}
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.declineBtn, { borderColor: colors.destructive }]}
                      onPress={() => handleDeclineRequest(req)}
                      disabled={respondingId === req.id}
                    >
                      <Text style={[styles.declineBtnText, { color: colors.destructive }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: colors.primary, flex: 1 }]}
                      onPress={() => handleAcceptRequest(req)}
                      disabled={respondingId === req.id}
                    >
                      {respondingId === req.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : (
                          <>
                            <Feather name="check" size={14} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accept & Start</Text>
                          </>
                        )
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Pending Appointment Requests */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Appointment Requests
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.warning + "22" }]}>
                <Text style={[styles.countText, { color: colors.warning }]}>{pending.length}</Text>
              </View>
            </View>
            {pending.map((apt) => (
              <AppointmentCard
                key={apt.id}
                item={apt}
                onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: apt.id } })}
                onAccept={handleAcceptApt}
                onDecline={handleDeclineApt}
              />
            ))}
          </View>
        )}

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Upcoming Appointments
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/appointments")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {loadingApts ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No upcoming appointments"
              subtitle="Your schedule is clear"
            />
          ) : (
            upcoming.map((apt) => (
              <AppointmentCard
                key={apt.id}
                item={apt}
                onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: apt.id } })}
                onComplete={handleComplete}
                onDecline={handleDeclineApt}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  doctorName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
  specialty: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  specialtyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  ratingText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  notifBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  badge: {
    position: "absolute", top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  statusSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusOptionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-around",
  },
  statPill: { alignItems: "center", gap: 4 },
  statVal: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#ffffff" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  liveStatusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  body: { padding: 20 },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  requestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  requestTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  requestAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#0EA5E9",
    alignItems: "center", justifyContent: "center",
  },
  requestAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  requestMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  requestMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  requestMsg: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  declineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  acceptBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
