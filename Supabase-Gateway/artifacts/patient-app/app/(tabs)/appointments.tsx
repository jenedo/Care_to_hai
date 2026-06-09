import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppointmentCard, AppointmentItem } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const UPCOMING_STATUSES = ["pending", "confirmed"];

export default function AppointmentsScreen() {
  const colors = useColors();
  const { patient, token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchAppointments = useCallback(async () => {
    if (!patient || !token) { setLoading(false); return; }
    try {
      const url = new URL(`${API_BASE}/api/appointments`);
      url.searchParams.set("patient_id", patient.id);
      url.searchParams.set("limit", "100");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data?.data ?? []);
      }
    } catch {}
    setLoading(false);
  }, [patient, token]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const filtered = filter === "all"
    ? appointments
    : filter === "upcoming"
      ? appointments.filter((a) => UPCOMING_STATUSES.includes(a.status))
      : appointments.filter((a) => a.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? colors.primary : colors.card,
                borderColor: filter === f.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.key ? "#fff" : colors.mutedForeground },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No appointments"
            subtitle={
              filter === "all"
                ? "Book a consultation with a doctor to get started."
                : `No ${filter === "upcoming" ? "upcoming" : filter} appointments.`
            }
            actionLabel={filter === "all" ? "Find a Doctor" : undefined}
            onAction={filter === "all" ? () => router.push("/(tabs)/doctors") : undefined}
          />
        ) : (
          filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              item={appt}
              onPress={() => router.push(`/appointment/${appt.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { maxHeight: 56, borderBottomWidth: 1 },
  filterContent: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { flex: 1 },
  listContent: { padding: 16 },
});
