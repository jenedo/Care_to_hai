import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListAppointments } from "@asaancare/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://api.asaancare.pk";

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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: doctor?.fullName ?? "",
    bio: (doctor as any)?.bio ?? "",
    city: doctor?.city ?? "",
    consultationFee: doctor?.consultationFee ?? "",
  });

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

  const handleSave = async () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      setSaveError("Name must be at least 2 characters."); return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const token = await AsyncStorage.getItem("asaancare_doctor_token");
      const res = await fetch(`${API_BASE}/api/doctor/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          bio: form.bio || null,
          city: form.city || null,
          consultationFee: form.consultationFee ? String(form.consultationFee) : null,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const d = await res.json();
        setSaveError(d?.error ?? "Failed to save changes.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const handleDocumentRequest = () => {
    Alert.alert(
      "Document Update Request",
      "Changes to your qualifications, certifications, or PMDC details require admin review for safety.\n\nA request will be sent to the AsaanCare team who will contact you within 24 hours.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit Request",
          onPress: () => Alert.alert("Request Submitted", "Our team will contact you within 24 hours to process your document update."),
        },
      ]
    );
  };

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
      <View style={[styles.hero, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor?.fullName?.charAt(0) ?? "D"}</Text>
        </View>
        <Text style={styles.name}>{doctor?.fullName ?? "Doctor"}</Text>
        <Text style={styles.specialty}>{doctor?.specialty ?? "—"}</Text>
        <Text style={styles.city}>
          <Feather name="map-pin" size={12} color="rgba(255,255,255,0.5)" /> {doctor?.city ?? "—"}
        </Text>
        {!editing && (
          <TouchableOpacity
            style={styles.editHeroBadge}
            onPress={() => {
              setForm({ fullName: doctor?.fullName ?? "", bio: (doctor as any)?.bio ?? "", city: doctor?.city ?? "", consultationFee: doctor?.consultationFee ?? "" });
              setSaveError("");
              setEditing(true);
            }}
          >
            <Feather name="edit-2" size={13} color="#fff" />
            <Text style={styles.editHeroBadgeText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{stats.total}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>PKR {(stats.earnings / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>
      </View>

      {saveSuccess && (
        <View style={[styles.toast, { backgroundColor: "#D1FAE5" }]}>
          <Feather name="check-circle" size={16} color="#065F46" />
          <Text style={[styles.toastText, { color: "#065F46" }]}>Profile updated successfully!</Text>
        </View>
      )}

      {editing && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>EDIT PROFILE</Text>
          {!!saveError && (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="alert-circle" size={14} color="#991B1B" />
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={form.fullName}
              onChangeText={v => setForm(f => ({ ...f, fullName: v }))}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bio / About</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={form.bio}
              onChangeText={v => setForm(f => ({ ...f, bio: v }))}
              placeholder="Describe your expertise and experience…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>City</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={form.city}
              onChangeText={v => setForm(f => ({ ...f, city: v }))}
              placeholder="e.g. Karachi"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Consultation Fee (Rs.)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={String(form.consultationFee ?? "")}
              onChangeText={v => setForm(f => ({ ...f, consultationFee: v }))}
              placeholder="e.g. 1000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.lockedNote, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}>
            <Feather name="lock" size={13} color="#92400E" />
            <Text style={styles.lockedText}>
              PMDC number, specialty, and documents cannot be edited here. Use "Update Documents" below to request a change through admin review.
            </Text>
          </View>

          <View style={styles.editActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditing(false)} disabled={saving}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <Row icon="calendar" label="Manage Availability" onPress={() => router.push("/(tabs)/availability")} iconBg={colors.primary} />
        <Row icon="bar-chart-2" label="Appointments" onPress={() => router.push("/(tabs)/appointments")} iconBg={colors.info} />
        <Row icon="file-text" label="Update Documents" onPress={handleDocumentRequest} iconBg="#8B5CF6" />
        <Row icon="shield" label="Privacy & Security" onPress={() => {}} iconBg="#6366f1" />
        <Row icon="help-circle" label="Help & Support" onPress={() => {}} iconBg={colors.warning} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="log-out" label="Sign Out" onPress={handleLogout} danger />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>AsaanCare Doctor v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: "center", paddingBottom: 28, gap: 4 },
  avatar: { width: 84, height: 84, borderRadius: 26, backgroundColor: "#10b77f", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff" },
  specialty: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  city: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginTop: 2 },
  editHeroBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginTop: 6 },
  editHeroBadgeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#fff" },
  statsRow: { flexDirection: "row", marginTop: 16, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, alignSelf: "stretch", marginHorizontal: 20, justifyContent: "space-around" },
  stat: { alignItems: "center", gap: 4, flex: 1 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffffff" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12 },
  toastText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  section: { borderRadius: 16, marginHorizontal: 16, marginTop: 16, borderWidth: 1, overflow: "hidden", paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingVertical: 12 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, marginBottom: 8 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#991B1B" },
  fieldRow: { paddingVertical: 12, gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  fieldInputMulti: { minHeight: 80, textAlignVertical: "top" },
  fieldDivider: { height: 1, marginVertical: 0 },
  lockedNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  lockedText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#92400E", lineHeight: 18 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular", maxWidth: 150, textAlign: "right" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 24 },
});
