import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Badge } from "./Badge";

export type AppointmentItem = {
  id: string;
  doctor_name?: string;
  doctor_specialty?: string;
  patient_name?: string;
  type: string;
  status: string;
  date_time?: string;
  start_time?: string;
  amount?: number;
  notes?: string;
  patient_id?: string;
  doctor_id?: string;
  cancellation_reason?: string | null;
};

interface AppointmentCardProps {
  item: AppointmentItem;
  onPress?: () => void;
}

function formatDateTime(dt?: string, startTime?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  const dateStr = d.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const timeStr = startTime
    ? (() => {
        const [h, m] = startTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hh = h % 12 || 12;
        return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
      })()
    : d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dateStr} · ${timeStr}`;
}

function typeIcon(type: string): keyof typeof Feather.glyphMap {
  if (type === "video") return "video";
  if (type === "online") return "monitor";
  if (type === "phone") return "phone";
  return "user";
}

function typeLabel(type: string) {
  if (type === "online") return "Online";
  if (type === "video") return "Video";
  if (type === "phone") return "Phone";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function AppointmentCard({ item, onPress }: AppointmentCardProps) {
  const colors = useColors();
  const dateStr = formatDateTime(item.date_time, item.start_time);
  const displayName = item.doctor_name ?? item.patient_name ?? "Unknown";
  const initials = displayName.replace(/^Dr\.\s*/i, "").charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          {item.doctor_specialty && (
            <Text style={[styles.specialty, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.doctor_specialty}
            </Text>
          )}
          <View style={styles.row}>
            <Feather name={typeIcon(item.type)} size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {" "}{typeLabel(item.type)}
            </Text>
          </View>
          <View style={styles.row}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {" "}{dateStr}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Badge status={item.status} size="sm" />
          {item.amount != null && (
            <Text style={[styles.fee, { color: colors.primary }]}>
              PKR {item.amount.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  specialty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", alignItems: "center" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end", gap: 4 },
  fee: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
