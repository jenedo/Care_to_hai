import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {};

function getStatusConfig(status: string, colors: ReturnType<typeof useColors>) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: "Pending", bg: "#FEF3C7", text: "#92400E" },
    confirmed: { label: "Confirmed", bg: colors.primaryLight, text: colors.primaryDark },
    completed: { label: "Completed", bg: "#D1FAE5", text: "#065F46" },
    cancelled: { label: "Cancelled", bg: "#FEE2E2", text: "#991B1B" },
    rejected: { label: "Rejected", bg: "#FEE2E2", text: "#991B1B" },
    active: { label: "Active", bg: "#D1FAE5", text: "#065F46" },
    verified: { label: "Verified", bg: colors.primaryLight, text: colors.primaryDark },
    unverified: { label: "Unverified", bg: "#FEF3C7", text: "#92400E" },
  };
  return map[status] ?? { label: status, bg: colors.muted, text: colors.mutedForeground };
}

interface BadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function Badge({ status, size = "md" }: BadgeProps) {
  const colors = useColors();
  const config = getStatusConfig(status.toLowerCase(), colors);
  return (
    <View style={[styles.badge, size === "sm" ? styles.sm : styles.md, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, size === "sm" ? styles.smText : styles.mdText, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, alignSelf: "flex-start" },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  md: { paddingHorizontal: 12, paddingVertical: 5 },
  text: { fontFamily: "Inter_600SemiBold" },
  smText: { fontSize: 11 },
  mdText: { fontSize: 13 },
});
