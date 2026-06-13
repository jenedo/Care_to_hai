import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfileScreen() {
  const colors = useColors();
  const { patient, token, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: patient?.fullName ?? "",
    dateOfBirth: patient?.dateOfBirth ?? "",
    gender: patient?.gender ?? "",
    bloodGroup: patient?.bloodGroup ?? "",
    address: patient?.address ?? "",
  });

  useEffect(() => {
    if (patient) {
      setForm({
        fullName: patient.fullName ?? "",
        dateOfBirth: patient.dateOfBirth ?? "",
        gender: patient.gender ?? "",
        bloodGroup: patient.bloodGroup ?? "",
        address: patient.address ?? "",
      });
    }
  }, [patient]);

  const handleSave = async () => {
    if (!form.fullName.trim()) { setSaveError("Name cannot be empty."); return; }
    if (!patient?.id || !token) { setSaveError("Not authenticated."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`${API_BASE}/api/patient/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          bloodGroup: form.bloodGroup || null,
          address: form.address || null,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const d = await res.json();
        setSaveError(d?.error ?? "Unable to save. Please try again.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { setLoggingOut(true); await logout(); } },
    ]);
  };

  const initials = patient?.fullName
    ? patient.fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "P";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.navBackground, paddingTop: insets.top + 20 }]}>
        <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{patient?.fullName ?? "Patient"}</Text>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>AsaanCare Patient</Text>
        </View>
        {!editing && (
          <TouchableOpacity
            style={[styles.editBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => { setEditing(true); setSaveError(""); }}
          >
            <Feather name="edit-2" size={13} color="#fff" />
            <Text style={styles.editBadgeText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {saveSuccess && (
        <View style={[styles.toast, { backgroundColor: "#D1FAE5" }]}>
          <Feather name="check-circle" size={16} color="#065F46" />
          <Text style={[styles.toastText, { color: "#065F46" }]}>Profile updated successfully!</Text>
        </View>
      )}
      {!!saveError && (
        <View style={[styles.toast, { backgroundColor: "#FEE2E2" }]}>
          <Feather name="alert-circle" size={16} color="#991B1B" />
          <Text style={[styles.toastText, { color: "#991B1B" }]}>{saveError}</Text>
        </View>
      )}

      {editing && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EDIT PROFILE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <EditField label="Full Name" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} colors={colors} autoCapitalize="words" />
            <Divider color={colors.border} />
            <EditField label="Date of Birth" value={form.dateOfBirth} onChangeText={v => setForm(f => ({ ...f, dateOfBirth: v }))} colors={colors} placeholder="YYYY-MM-DD" />
            <Divider color={colors.border} />
            <EditField label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} colors={colors} />

            <Divider color={colors.border} />
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, { borderColor: form.gender === g ? colors.primary : colors.border, backgroundColor: form.gender === g ? colors.primaryLight : "transparent" }]}
                    onPress={() => setForm(f => ({ ...f, gender: g }))}
                  >
                    <Text style={[styles.chipText, { color: form.gender === g ? colors.primary : colors.mutedForeground }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Divider color={colors.border} />
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Blood Group</Text>
              <View style={styles.chipRow}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.chip, { borderColor: form.bloodGroup === bg ? "#EF4444" : colors.border, backgroundColor: form.bloodGroup === bg ? "#FEE2E2" : "transparent" }]}
                    onPress={() => setForm(f => ({ ...f, bloodGroup: bg }))}
                  >
                    <Text style={[styles.chipText, { color: form.bloodGroup === bg ? "#DC2626" : colors.mutedForeground }]}>{bg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.note, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}>
            <Feather name="lock" size={12} color="#92400E" />
            <Text style={styles.noteText}>Email and phone number cannot be changed here. Contact support for those changes.</Text>
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

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PERSONAL INFORMATION</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "mail" as const, label: "Email", value: patient?.email },
            { icon: "calendar" as const, label: "Date of Birth", value: patient?.dateOfBirth ?? "Not set" },
            { icon: "user" as const, label: "Gender", value: patient?.gender ?? "Not set" },
            { icon: "droplet" as const, label: "Blood Group", value: patient?.bloodGroup ?? "Not set" },
            { icon: "map-pin" as const, label: "Address", value: patient?.address ?? "Not set" },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.row, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
                <Feather name={row.icon} size={15} color={colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.rowValue, { color: colors.foreground }]}>{row.value ?? "—"}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <>
              <Feather name="log-out" size={16} color={colors.destructive} />
              <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function EditField({ label, value, onChangeText, colors, placeholder, autoCapitalize }: any) {
  return (
    <View style={styles.editField}>
      <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.editInput, { color: colors.foreground, borderColor: colors.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize={autoCapitalize ?? "none"}
      />
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 28, alignItems: "center", gap: 8, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  editBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12 },
  toastText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  editField: { padding: 14, gap: 8 },
  editLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  editInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginHorizontal: 14 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#92400E", lineHeight: 17 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
