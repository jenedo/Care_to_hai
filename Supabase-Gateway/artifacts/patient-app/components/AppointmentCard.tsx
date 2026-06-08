import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Badge } from "./Badge";

export type AppointmentItem = {
  id: string;
  doctor_name?: string;
  patient_name?: string;
  type: string;
  status: string;
  date_time?: string;
  scheduled_at?: string;
  fee?: number;
  notes?: string;
};

interface AppointmentCardProps {
  item: AppointmentItem;
  onPress?: () => void;
}

function formatDateTime(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return (
    d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

export function AppointmentCard({ item, onPress }: AppointmentCardProps) {
  const colors = useColors();
  const dateStr = formatDateTime(item.date_time ?? item.scheduled_at);
  const displayName = item.doctor_name ?? item.patient_name ?? "Unknown";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {displayName.charAt(0)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.row}>
            <Feather name={item.type === "video" ? "video" : "user"} size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {" "}{item.type ?? "Consultation"}
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
          {item.fee != null && (
            <Text style={[styles.fee, { color: colors.primary }]}>
              PKR {item.fee.toLocaleString()}
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
  row: { flexDirection: "row", alignItems: "center" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end", gap: 4 },
  fee: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
