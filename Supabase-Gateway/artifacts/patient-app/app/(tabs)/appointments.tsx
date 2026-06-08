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

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

export default function AppointmentsScreen() {
  const colors = useColors();
  const { patient, token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchAppointments = useCallback(async () => {
    if (!patient || !token) return;
    try {
      const url = new URL(`${API_BASE}/api/appointments`);
      url.searchParams.set("patient_id", patient.id);
      url.searchParams.set("limit", "50");
      url.searchParams.set("order", "desc");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data?.data?.items ?? data?.data ?? []);
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
            key={f}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f ? colors.primary : colors.card,
                borderColor: filter === f ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
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
            subtitle={filter === "all" ? "Book a consultation with a doctor to get started." : `No ${filter} appointments.`}
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
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { flex: 1 },
  listContent: { padding: 16 },
});
