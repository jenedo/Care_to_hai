import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { AppointmentCard, type AppointmentItem } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";

const TABS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    let list = all;
    if (activeTab !== "All") {
      list = list.filter((a) => a.status === activeTab.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.patient_name?.toLowerCase().includes(q));
    }
    return list;
  }, [all, activeTab, search]);

  const counts = useMemo(() => ({
    All: all.length,
    Pending: all.filter((a) => a.status === "pending").length,
    Confirmed: all.filter((a) => a.status === "confirmed").length,
    Completed: all.filter((a) => a.status === "completed").length,
    Cancelled: all.filter((a) => a.status === "cancelled").length,
  }), [all]);

  const handleAccept = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "confirmed" } });
  };
  const handleDecline = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "cancelled" } });
  };
  const handleComplete = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "completed" } });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Appointments</Text>
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

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  active
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: "rgba(255,255,255,0.1)" },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? "#fff" : "rgba(255,255,255,0.6)" },
                  ]}
                >
                  {tab}
                </Text>
                {counts[tab] > 0 && (
                  <View
                    style={[
                      styles.tabCount,
                      { backgroundColor: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)" },
                    ]}
                  >
                    <Text style={[styles.tabCountText, { color: active ? "#fff" : "rgba(255,255,255,0.7)" }]}>
                      {counts[tab]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={search ? "No results" : `No ${activeTab !== "All" ? activeTab.toLowerCase() : ""} appointments`}
            subtitle={search ? "Try a different name" : "Pull to refresh"}
          />
        ) : (
          filtered.map((apt) => (
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tabCount: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
});
