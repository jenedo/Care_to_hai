import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { AppointmentCard, type AppointmentItem } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { StatsCard } from "@/components/StatsCard";
import { router } from "expo-router";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor } = useAuth();
  const queryClient = useQueryClient();

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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleAccept = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "confirmed" } });
  };
  const handleDecline = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "cancelled" } });
  };
  const handleComplete = async (id: string) => {
    await updateApt.mutateAsync({ id, data: { status: "completed" } });
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loadingApts}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.navBackground,
            paddingTop: topPad + 16,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.doctorName} numberOfLines={1}>
              {doctor?.fullName ?? "Doctor"}
            </Text>
            <Text style={styles.specialty}>{doctor?.specialty ?? ""}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => router.push("/(tabs)/appointments")}
            activeOpacity={0.8}
          >
            <Feather name="bell" size={20} color="#ffffff" />
            {pending.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>{pending.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statVal}>{pending.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statVal}>{todayApts.length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statVal}>PKR {(totalEarnings / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>Earned</Text>
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

        {/* Pending Requests */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Consultation Requests
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
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}
          </View>
        )}

        {/* Upcoming */}
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
                onDecline={handleDecline}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  specialty: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-around",
  },
  statPill: { alignItems: "center", gap: 4 },
  statVal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  body: { padding: 20 },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
