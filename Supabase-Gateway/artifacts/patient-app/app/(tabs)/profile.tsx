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

export default function ProfileScreen() {
  const colors = useColors();
  const { patient, token, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(patient?.fullName ?? "");
  const [editPhone, setEditPhone] = useState(patient?.phone ?? "");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (patient) {
      setEditName(patient.fullName ?? "");
      setEditPhone(patient.phone ?? "");
    }
  }, [patient]);

  const handleEdit = () => {
    setEditing(true);
    setSaveError("");
    setSaveSuccess(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditName(patient?.fullName ?? "");
    setEditPhone(patient?.phone ?? "");
    setSaveError("");
  };

  const handleSave = async () => {
    if (!editName.trim()) { setSaveError("Name cannot be empty."); return; }
    if (!patient?.id || !token) { setSaveError("Not authenticated."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: editName.trim(), phone: editPhone.trim() }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError("Unable to save. Please contact support.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  const initials = patient?.fullName
    ? patient.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "P";

  const readOnlyRows = [
    { icon: "mail" as const, label: "Email", value: patient?.email },
    { icon: "calendar" as const, label: "Date of Birth", value: patient?.dateOfBirth ?? "Not set" },
    { icon: "user" as const, label: "Gender", value: patient?.gender ?? "Not set" },
    { icon: "droplet" as const, label: "Blood Group", value: patient?.bloodGroup ?? "Not set" },
    { icon: "map-pin" as const, label: "Address", value: patient?.address ?? "Not set" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroSection, { backgroundColor: colors.navBackground }]}>
        <View style={styles.heroInner}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{patient?.fullName ?? "Patient"}</Text>
          <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={styles.roleText}>Patient</Text>
          </View>
          {!editing && (
            <TouchableOpacity
              style={[styles.editBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}
              onPress={handleEdit}
            >
              <Feather name="edit-2" size={13} color="#fff" />
              <Text style={styles.editBadgeText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {saveSuccess && (
        <View style={[styles.toast, { backgroundColor: "#D1FAE5" }]}>
          <Feather name="check-circle" size={16} color="#065F46" />
          <Text style={[styles.toastText, { color: "#065F46" }]}>Profile updated successfully!</Text>
        </View>
      )}
      {saveError ? (
        <View style={[styles.toast, { backgroundColor: "#FEE2E2" }]}>
          <Feather name="alert-circle" size={16} color="#991B1B" />
          <Text style={[styles.toastText, { color: "#991B1B" }]}>{saveError}</Text>
        </View>
      ) : null}

      {editing && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>EDIT PROFILE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              <TextInput
                style={[styles.editInput, { color: colors.foreground, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Phone</Text>
              <TextInput
                style={[styles.editInput, { color: colors.foreground, borderColor: colors.border }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+92-3001234567"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PERSONAL INFORMATION</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {readOnlyRows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.row,
                i < readOnlyRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  heroSection: { marginBottom: 20 },
  heroInner: { paddingTop: 28, paddingBottom: 28, alignItems: "center", gap: 10 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  editBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12 },
  toastText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  editField: { padding: 14, gap: 6 },
  editLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  editInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginHorizontal: 14 },
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
