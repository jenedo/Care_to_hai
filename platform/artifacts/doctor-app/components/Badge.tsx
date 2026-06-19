import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type BadgeVariant = "pending" | "confirmed" | "completed" | "cancelled" | "default";

const VARIANT_MAP: Record<string, BadgeVariant> = {
  pending: "pending",
  confirmed: "confirmed",
  completed: "completed",
  cancelled: "cancelled",
};

interface BadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function Badge({ status, size = "md" }: BadgeProps) {
  const colors = useColors();
  const variant: BadgeVariant = VARIANT_MAP[status?.toLowerCase()] ?? "default";

  const config = {
    pending: { bg: "#fef3c7", text: "#92400e", label: "Pending" },
    confirmed: { bg: colors.primaryLight, text: colors.primaryDark, label: "Confirmed" },
    completed: { bg: "#dbeafe", text: "#1e40af", label: "Completed" },
    cancelled: { bg: "#fee2e2", text: "#991b1b", label: "Cancelled" },
    default: { bg: colors.muted, text: colors.mutedForeground, label: status ?? "—" },
  };

  const c = config[variant];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, size === "sm" && styles.sm]}>
      <Text style={[styles.text, { color: c.text }, size === "sm" && styles.textSm]}>
        {c.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  textSm: {
    fontSize: 11,
  },
});
