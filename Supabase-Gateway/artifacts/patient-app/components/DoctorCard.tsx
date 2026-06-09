import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type DoctorItem = {
  id: string;
  name: string;
  specialty: string;
  city?: string;
  fee?: number | null;
  rating?: number | null;
  verification_status?: string;
  appointments_completed?: number;
  is_available_online?: boolean;
  total_reviews?: number;
  qualifications?: string[];
  bio?: string | null;
};

interface DoctorCardProps {
  item: DoctorItem;
  onPress?: () => void;
}

const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: "#FEE2E2",
  Dermatology: "#FCE7F3",
  Neurology: "#EDE9FE",
  Orthopedics: "#DBEAFE",
  Pediatrics: "#D1FAE5",
  Psychiatry: "#FEF3C7",
  default: "#E0F2FE",
};

const SPECIALTY_TEXT: Record<string, string> = {
  Cardiology: "#991B1B",
  Dermatology: "#9D174D",
  Neurology: "#5B21B6",
  Orthopedics: "#1E40AF",
  Pediatrics: "#065F46",
  Psychiatry: "#92400E",
  default: "#0369A1",
};

function getSpecialtyColors(specialty: string) {
  return {
    bg: SPECIALTY_COLORS[specialty] ?? SPECIALTY_COLORS.default,
    text: SPECIALTY_TEXT[specialty] ?? SPECIALTY_TEXT.default,
  };
}

function getInitials(name: string) {
  const clean = name.replace(/^Dr\.\s*/i, "");
  return clean.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "D";
}

const AVATAR_COLORS = ["#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function DoctorCard({ item, onPress }: DoctorCardProps) {
  const colors = useColors();
  const fee = item.fee ?? null;
  const rating = item.rating ? Number(item.rating).toFixed(1) : null;
  const sc = getSpecialtyColors(item.specialty ?? "");
  const bg = avatarColor(item.id);
  const initials = getInitials(item.name ?? "D");
  const isOnline = item.is_available_online ?? false;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.body}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          <Text style={styles.avatarText}>{initials}</Text>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? "#22C55E" : "#94A3B8" }]} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={[styles.specialtyBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.specialtyText, { color: sc.text }]}>{item.specialty}</Text>
          </View>

          <View style={styles.metaRow}>
            {item.city && (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}> {item.city}</Text>
              </View>
            )}
            {rating && (
              <View style={styles.metaItem}>
                <Feather name="star" size={11} color="#F59E0B" />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {" "}{rating}
                  {(item.total_reviews ?? 0) > 0 ? ` (${item.total_reviews})` : ""}
                </Text>
              </View>
            )}
          </View>

          {fee != null && (
            <Text style={[styles.fee, { color: colors.primary }]}>
              PKR {fee.toLocaleString()} / visit
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.viewBtn, { color: colors.primary }]}>View Profile →</Text>
        {(item.appointments_completed ?? 0) > 0 && (
          <View style={styles.metaItem}>
            <Feather name="check-circle" size={11} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {" "}{item.appointments_completed} completed
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  body: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  info: { flex: 1, gap: 5 },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 20 },
  specialtyBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  specialtyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fee: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  viewBtn: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
