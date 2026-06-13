import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type AppointmentDetail = {
  id: string;
  status: string;
  type: string;
  scheduled_at?: string;
  date_time?: string;
  start_time?: string;
  amount?: number;
  notes?: string | null;
  doctor_name?: string;
  doctor_specialty?: string;
  patient_name?: string;
  cancellation_reason?: string | null;
};

function formatDateTime(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return (
    d.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) +
    "\n" +
    d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

type DetailRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | number | null;
  accent?: string;
};

function DetailRow({ icon, label, value, accent }: DetailRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.primaryLight }]}>
        <Feather name={icon} size={14} color={accent ?? colors.primary} />
      </View>
      <View style={styles.detailInfo}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: accent ?? colors.foreground }]}>
          {value ?? "—"}
        </Text>
      </View>
    </View>
  );
}

export default function AppointmentDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAppointment(data?.data ?? null);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    })();
  }, [id, token]);

  if (loading) return <LoadingSpinner />;

  if (error || !appointment) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Appointment not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dateTime = formatDateTime(appointment.date_time ?? appointment.scheduled_at);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.navBackground }]}>
        <View style={styles.headerInner}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>
              {(appointment.doctor_name ?? "?").charAt(0)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {appointment.doctor_name ?? "Doctor"}
            </Text>
            {appointment.doctor_specialty && (
              <Text style={styles.headerSpecialty}>{appointment.doctor_specialty}</Text>
            )}
          </View>
          <Badge status={appointment.status} size="sm" />
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DetailRow
            icon="calendar"
            label="Date & Time"
            value={dateTime}
          />
          <DetailRow
            icon={appointment.type === "video" ? "video" : "user"}
            label="Type"
            value={appointment.type?.charAt(0).toUpperCase() + appointment.type?.slice(1)}
          />
          {appointment.amount != null && (
            <DetailRow
              icon="credit-card"
              label="Consultation Fee"
              value={`PKR ${Number(appointment.amount).toLocaleString()}`}
              accent={colors.primary}
            />
          )}
          {appointment.notes && (
            <DetailRow
              icon="file-text"
              label="Notes"
              value={appointment.notes}
            />
          )}
        </View>
      </View>

      {appointment.status === "confirmed" && appointment.type === "video" && (
        <View style={[styles.section]}>
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="video" size={18} color="#fff" />
            <Text style={styles.joinBtnText}>Join Video Call</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium" },
  headerCard: { marginBottom: 20 },
  headerInner: { flexDirection: "row", alignItems: "center", padding: 20, gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  headerSpecialty: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1 },
  detailIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1, lineHeight: 20 },
  joinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14 },
  joinBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
