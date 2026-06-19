import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

type Patient = {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  city?: string;
  area?: string;
  emergencyContact?: string;
  totalAppointments?: number;
};

type Appointment = {
  id: string;
  appointmentDate: string;
  status: string;
  consultationType: string;
  fee?: string;
  notes?: string;
};

type Prescription = {
  id: string;
  diagnosis?: string;
  medicines: any[];
  followUpDate?: string;
  createdAt: string;
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={14} color={colors.mutedForeground} />
      </View>
      <View>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#10B981",
  CANCELLED: "#EF4444",
  CONFIRMED: "#0EA5E9",
  HELD: "#F59E0B",
  NO_SHOW: "#94A3B8",
};

export default function PatientDetailScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "appointments" | "prescriptions">("info");

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctor/patient/${patientId}`, { headers: authHeaders });
      const json = await res.json();
      if (json?.data) {
        setPatient(json.data.patient);
        setAppointments(json.data.appointments ?? []);
        setPrescriptions(json.data.prescriptions ?? []);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [patientId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Patient not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = patient.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.patientBrief}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.patientName}>{patient.fullName}</Text>
            <Text style={styles.patientMeta}>
              {[patient.gender, patient.city].filter(Boolean).join(" · ") || "Patient"}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["info", "appointments", "prescriptions"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab === "info" ? "Info" : tab === "appointments" ? `Visits (${appointments.length})` : `Rx (${prescriptions.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        {activeTab === "info" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {patient.phone && <InfoRow icon="phone" label="Phone" value={patient.phone} />}
            {patient.email && <InfoRow icon="mail" label="Email" value={patient.email} />}
            {patient.dateOfBirth && <InfoRow icon="calendar" label="Date of Birth" value={patient.dateOfBirth} />}
            {patient.gender && <InfoRow icon="user" label="Gender" value={patient.gender} />}
            {patient.bloodGroup && <InfoRow icon="droplet" label="Blood Group" value={patient.bloodGroup} />}
            {patient.city && <InfoRow icon="map-pin" label="City" value={[patient.city, patient.area].filter(Boolean).join(", ")} />}
            {patient.emergencyContact && <InfoRow icon="alert-circle" label="Emergency Contact" value={patient.emergencyContact} />}
          </View>
        )}

        {activeTab === "appointments" && (
          appointments.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No previous appointments</Text>
            </View>
          ) : (
            appointments.map(apt => {
              const statusColor = STATUS_COLORS[apt.status] ?? "#94A3B8";
              return (
                <View key={apt.id} style={[styles.aptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.aptTop}>
                    <Text style={[styles.aptDate, { color: colors.foreground }]}>
                      {new Date(apt.appointmentDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{apt.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.aptMeta, { color: colors.mutedForeground }]}>
                    {apt.consultationType} {apt.fee ? `· PKR ${Number(apt.fee).toLocaleString()}` : ""}
                  </Text>
                  {apt.notes ? <Text style={[styles.aptNotes, { color: colors.mutedForeground }]} numberOfLines={2}>{apt.notes}</Text> : null}
                </View>
              );
            })
          )
        )}

        {activeTab === "prescriptions" && (
          prescriptions.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No prescriptions issued</Text>
            </View>
          ) : (
            prescriptions.map(rx => (
              <View key={rx.id} style={[styles.rxCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rxTop}>
                  <Text style={[styles.rxDate, { color: colors.foreground }]}>
                    {new Date(rx.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                  <View style={[styles.rxBadge, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={[styles.rxBadgeText, { color: colors.primary }]}>{(rx.medicines as any[]).length} medicine{(rx.medicines as any[]).length !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
                {rx.diagnosis ? <Text style={[styles.rxDiag, { color: colors.foreground }]}>{rx.diagnosis}</Text> : null}
                {(rx.medicines as any[]).slice(0, 3).map((m: any, i: number) => (
                  <Text key={i} style={[styles.rxMed, { color: colors.mutedForeground }]}>
                    • {m.name} {m.dosage ? `(${m.dosage})` : ""} — {m.timing}
                  </Text>
                ))}
                {rx.followUpDate ? (
                  <View style={styles.rxFollowUp}>
                    <Feather name="calendar" size={12} color={colors.primary} />
                    <Text style={[styles.rxFollowUpText, { color: colors.primary }]}>Follow-up: {rx.followUpDate}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  patientBrief: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  patientName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  patientMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingTop: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  infoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  aptCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  aptTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  aptDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aptMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aptNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  rxCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  rxTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rxDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rxBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  rxBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rxDiag: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rxMed: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rxFollowUp: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rxFollowUpText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
