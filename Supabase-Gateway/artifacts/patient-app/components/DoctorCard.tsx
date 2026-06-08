import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Badge } from "./Badge";

export type DoctorItem = {
  id: string;
  fullName: string;
  specialty: string;
  city?: string;
  consultationFee?: string | number | null;
  rating?: string | number | null;
  verificationStatus?: string;
  appointmentsCompleted?: number;
};

interface DoctorCardProps {
  item: DoctorItem;
  onPress?: () => void;
}

export function DoctorCard({ item, onPress }: DoctorCardProps) {
  const colors = useColors();
  const fee = item.consultationFee ? Number(item.consultationFee) : null;
  const rating = item.rating ? Number(item.rating).toFixed(1) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {item.fullName.charAt(0)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            Dr. {item.fullName}
          </Text>
          <Text style={[styles.specialty, { color: colors.primary }]}>{item.specialty}</Text>
          {item.city && (
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={[styles.meta, { color: colors.mutedForeground }]}> {item.city}</Text>
            </View>
          )}
        </View>
        <View style={styles.right}>
          {item.verificationStatus && (
            <Badge status={item.verificationStatus} size="sm" />
          )}
          {rating && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color="#f59e0b" />
              <Text style={[styles.rating, { color: colors.foreground }]}> {rating}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {fee != null && (
          <View style={styles.metaRow}>
            <Feather name="credit-card" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {" "}PKR {fee.toLocaleString()} / visit
            </Text>
          </View>
        )}
        {(item.appointmentsCompleted ?? 0) > 0 && (
          <View style={styles.metaRow}>
            <Feather name="check-circle" size={12} color={colors.success} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {" "}{item.appointmentsCompleted} completed
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  specialty: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", alignItems: "center" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end", gap: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  rating: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
});
