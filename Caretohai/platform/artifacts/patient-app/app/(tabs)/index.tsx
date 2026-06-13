import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { StatsCard } from "@/components/StatsCard";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const { patient, token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async () => {
    if (!patient || !token) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${API_BASE}/api/appointments?patient_id=${patient.id}&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data?.data ?? []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [patient, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const counts = {
    total: appointments.length,
    upcoming: appointments.filter((a) => a.status === "confirmed" || a.status === "pending").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  const firstName = patient?.fullName?.split(" ")[0] ?? "there";
  const upcomingAppt = appointments.find((a) => a.status === "confirmed" || a.status === "pending");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroSection, { backgroundColor: colors.navBackground }]}>
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: 20 }}>
          <Text style={styles.greeting}>Assalam o Alaikum, {firstName}! 👋</Text>
          <Text style={styles.heroSubtitle}>How are you feeling today?</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          label="Total"
          value={counts.total}
          sub="appointments"
          icon={<Feather name="calendar" size={16} color={colors.primary} />}
        />
        <StatsCard
          label="Upcoming"
          value={counts.upcoming}
          sub="scheduled"
          accent={colors.info}
          icon={<Feather name="clock" size={16} color={colors.info} />}
        />
        <StatsCard
          label="Completed"
          value={counts.completed}
          sub="visits"
          accent={colors.success}
          icon={<Feather name="check-circle" size={16} color={colors.success} />}
        />
      </View>

      {upcomingAppt && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Next Appointment</Text>
          <AppointmentCard
            item={upcomingAppt}
            onPress={() => router.push(`/appointment/${upcomingAppt.id}`)}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Appointments</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/appointments")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading…</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No appointments yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Book your first consultation with a doctor
            </Text>
            <TouchableOpacity
              style={[styles.bookBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/doctors")}
            >
              <Text style={[styles.bookBtnText, { color: "#fff" }]}>Find a Doctor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              item={appt}
              onPress={() => router.push(`/appointment/${appt.id}`)}
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/doctors")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name="user-check" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Find Doctor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/doctors")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#F3E8FF" }]}>
              <Feather name="message-circle" size={22} color="#7C3AED" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Chat Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/appointments")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="calendar" size={22} color={colors.info} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/plans")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="star" size={22} color={colors.warning} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  heroSection: { marginBottom: 0 },
  greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: -12, marginBottom: 20 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  loadingRow: { paddingVertical: 32, alignItems: "center" },
  loadingText: { fontSize: 14 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  bookBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  bookBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 8 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
});
