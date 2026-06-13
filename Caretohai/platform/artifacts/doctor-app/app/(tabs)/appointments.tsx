import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListAppointments,
  useUpdateAppointment,
  getListAppointmentsQueryKey,
} from "@asaancare/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { AppointmentCard, type AppointmentItem } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

type ConsultRequest = {
  id: string;
  type: string;
  message?: string;
  status: string;
  createdAt: string;
  patientName?: string;
};

const APT_TABS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type AptTab = (typeof APT_TABS)[number];

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AptTab | "Requests">("Requests");
  const [search, setSearch] = useState("");
  const [consultRequests, setConsultRequests] = useState<ConsultRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const { data: aptData, isLoading, refetch, isRefetching } = useListAppointments({
    doctor_id: doctor?.id,
    limit: 100,
  });

  const updateApt = useUpdateAppointment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }),
    },
  });

  const all = useMemo<AppointmentItem[]>(() => {
    const raw = (aptData as any)?.data ?? aptData ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [aptData]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultation-requests/doctor`, { headers: authHeaders });
      const data = await res.json();
      setConsultRequests(data?.data ?? []);
    } catch {}
    setLoadingRequests(false);
  }, [token, authHeaders]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

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
      }
    } catch {}
    setRespondingId(null);
  };

  const handleDeclineRequest = async (req: ConsultRequest) => {
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
  };

  const filtered = useMemo(() => {
    if (activeTab === "Requests") return [];
    let list = all;
    if (activeTab !== "All") {
      list = list.filter(a => a.status === activeTab.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.patient_name?.toLowerCase().includes(q));
    }
    return list;
  }, [all, activeTab, search]);

  const counts = useMemo(() => ({
    Requests: consultRequests.length,
    All: all.length,
    Pending: all.filter(a => a.status === "pending").length,
    Confirmed: all.filter(a => a.status === "confirmed").length,
    Completed: all.filter(a => a.status === "completed").length,
    Cancelled: all.filter(a => a.status === "cancelled").length,
  }), [all, consultRequests]);

  const handleAccept = async (id: string) => updateApt.mutateAsync({ id, data: { status: "confirmed" } });
  const handleDecline = async (id: string) => updateApt.mutateAsync({ id, data: { status: "cancelled" } });
  const handleComplete = async (id: string) => updateApt.mutateAsync({ id, data: { status: "completed" } });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const TABS = ["Requests", ...APT_TABS] as const;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Appointments</Text>
        {activeTab !== "Requests" && (
          <View style={[styles.searchBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map(tab => {
            const active = activeTab === tab;
            const count = counts[tab as keyof typeof counts] ?? 0;
            const isReq = tab === "Requests";
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  active
                    ? { backgroundColor: isReq && count > 0 ? "#EF4444" : colors.primary }
                    : { backgroundColor: "rgba(255,255,255,0.1)" },
                ]}
                onPress={() => setActiveTab(tab as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, { color: active ? "#fff" : "rgba(255,255,255,0.6)" }]}>
                  {tab}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)" }]}>
                    <Text style={[styles.tabCountText, { color: active ? "#fff" : "rgba(255,255,255,0.7)" }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || loadingRequests}
            onRefresh={() => { refetch(); fetchRequests(); }}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === "Requests" ? (
          loadingRequests ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : consultRequests.length === 0 ? (
            <EmptyState icon="inbox" title="No new requests" subtitle="New consultation requests will appear here" />
          ) : (
            consultRequests.map(req => (
              <View key={req.id} style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reqTop}>
                  <View style={[styles.reqAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.reqAvatarText}>{(req.patientName ?? "P").slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.reqInfo}>
                    <Text style={[styles.reqName, { color: colors.foreground }]}>{req.patientName ?? "Patient"}</Text>
                    <View style={styles.reqMeta}>
                      <Feather
                        name={req.type === "VIDEO" ? "video" : req.type === "AUDIO" ? "phone" : "message-circle"}
                        size={12}
                        color={colors.mutedForeground}
                      />
                      <Text style={[styles.reqMetaText, { color: colors.mutedForeground }]}>
                        {" "}{req.type} · {new Date(req.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                </View>
                {req.message ? (
                  <Text style={[styles.reqMessage, { color: colors.mutedForeground }]} numberOfLines={2}>"{req.message}"</Text>
                ) : null}
                <View style={styles.reqActions}>
                  <TouchableOpacity
                    style={[styles.declineBtn, { borderColor: colors.destructive }]}
                    onPress={() => handleDeclineRequest(req)}
                    disabled={respondingId === req.id}
                  >
                    <Text style={[styles.declineBtnText, { color: colors.destructive }]}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAcceptRequest(req)}
                    disabled={respondingId === req.id}
                  >
                    {respondingId === req.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Feather name="check" size={14} color="#fff" /><Text style={styles.acceptBtnText}>Accept</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={search ? "No results" : `No ${activeTab !== "All" ? activeTab.toLowerCase() : ""} appointments`}
            subtitle={search ? "Try a different name" : "Pull to refresh"}
          />
        ) : (
          filtered.map(apt => (
            <AppointmentCard
              key={apt.id}
              item={apt}
              onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: apt.id } })}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onComplete={handleComplete}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
  searchBox: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffff" },
  tabs: { flexDirection: "row", gap: 8, paddingRight: 4 },
  tab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tabCount: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  tabCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  list: { padding: 20, paddingBottom: 100, gap: 10 },
  reqCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  reqTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  reqAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reqAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  reqInfo: { flex: 1 },
  reqName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  reqMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  reqMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reqMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
  reqActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  declineBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  declineBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12 },
  acceptBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
