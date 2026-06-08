import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type InfoRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | null;
};

export default function ProfileScreen() {
  const colors = useColors();
  const { patient, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);

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

  const info: InfoRow[] = [
    { icon: "mail", label: "Email", value: patient?.email },
    { icon: "phone", label: "Phone", value: patient?.phone ?? "Not set" },
    { icon: "calendar", label: "Date of Birth", value: patient?.dateOfBirth ?? "Not set" },
    { icon: "user", label: "Gender", value: patient?.gender ?? "Not set" },
    { icon: "droplet", label: "Blood Group", value: patient?.bloodGroup ?? "Not set" },
    { icon: "map-pin", label: "Address", value: patient?.address ?? "Not set" },
  ];

  const initials = patient?.fullName
    ? patient.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "P";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroSection, { backgroundColor: colors.navBackground }]}>
        <View style={{ paddingTop: 24, paddingBottom: 32, alignItems: "center", gap: 12 }}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{patient?.fullName ?? "Patient"}</Text>
          <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={styles.roleText}>Patient</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          PERSONAL INFORMATION
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {info.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.row,
                i < info.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
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
  heroSection: { marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
