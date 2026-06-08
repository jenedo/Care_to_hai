import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListAppointments } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type RowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  iconBg?: string;
};

function Row({ icon, label, value, onPress, danger, iconBg }: RowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg ?? colors.muted }]}>
        <Feather name={icon} size={16} color={danger ? colors.destructive : (iconBg ? "#fff" : colors.mutedForeground)} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
      {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor, logout } = useAuth();

  const { data: aptData } = useListAppointments({
    doctor_id: doctor?.id,
    limit: 200,
  });

  const appointments = useMemo(() => {
    const raw = (aptData as any)?.data ?? aptData ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [aptData]);

  const stats = useMemo(() => ({
    total: appointments.length,
    completed: appointments.filter((a: any) => a.status === "completed").length,
    earnings: appointments
      .filter((a: any) => a.status === "completed")
      .reduce((s: number, a: any) => s + (a.fee ?? 0), 0),
  }), [appointments]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero header */}
      <View style={[styles.hero, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor?.fullName?.charAt(0) ?? "D"}</Text>
        </View>
        <Text style={styles.name}>{doctor?.fullName ?? "Doctor"}</Text>
        <Text style={styles.specialty}>{doctor?.specialty ?? "—"}</Text>
        <Text style={styles.city}>
          <Feather name="map-pin" size={12} color="rgba(255,255,255,0.5)" /> {doctor?.city ?? "—"}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{stats.total}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>PKR {(stats.earnings / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PRACTICE INFO</Text>
        <Row icon="credit-card" label="PMDC Number" value={doctor?.pmdcNumber ?? "—"} iconBg={colors.info} />
        <Row icon="phone" label="Phone" value={doctor?.phone ?? "—"} iconBg="#7c3aed" />
        <Row icon="mail" label="Email" value={doctor?.email ?? "—"} iconBg={colors.warning} />
        <Row
          icon="dollar-sign"
          label="Consultation Fee"
          value={doctor?.consultationFee ? `PKR ${Number(doctor.consultationFee).toLocaleString()}` : "—"}
          iconBg={colors.success}
        />
      </View>

      {/* Account */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <Row
          icon="calendar"
          label="Manage Availability"
          onPress={() => router.push("/(tabs)/availability")}
          iconBg={colors.primary}
        />
        <Row
          icon="bar-chart-2"
          label="Appointments"
          onPress={() => router.push("/(tabs)/appointments")}
          iconBg={colors.info}
        />
        <Row
          icon="shield"
          label="Privacy & Security"
          onPress={() => {}}
          iconBg="#6366f1"
        />
        <Row
          icon="help-circle"
          label="Help & Support"
          onPress={() => {}}
          iconBg={colors.warning}
        />
      </View>

      {/* Logout */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="log-out" label="Sign Out" onPress={handleLogout} danger />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        SahatGhar Doctor v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    alignItems: "center",
    paddingBottom: 28,
    gap: 4,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: "#10b77f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  specialty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  city: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 0,
    alignSelf: "stretch",
    marginHorizontal: 20,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: 4, flex: 1 },
  statVal: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  section: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    maxWidth: 150,
    textAlign: "right",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 24,
  },
});
