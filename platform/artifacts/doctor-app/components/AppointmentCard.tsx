import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Badge } from "./Badge";

export type AppointmentItem = {
  id: string;
  patient_name: string;
  doctor_name?: string;
  type: string;
  status: string;
  date_time?: string;
  scheduled_at?: string;
  fee?: number;
  notes?: string;
  patient_phone?: string;
};

interface AppointmentCardProps {
  item: AppointmentItem;
  onPress?: () => void;
  onAccept?: (id: string) => Promise<void>;
  onDecline?: (id: string) => Promise<void>;
  onComplete?: (id: string) => Promise<void>;
}

function formatDateTime(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function AppointmentCard({
  item,
  onPress,
  onAccept,
  onDecline,
  onComplete,
}: AppointmentCardProps) {
  const colors = useColors();
  const [loading, setLoading] = useState<"accept" | "decline" | "complete" | null>(null);
  const dateStr = formatDateTime(item.date_time ?? item.scheduled_at);
  const isPending = item.status === "pending";
  const isConfirmed = item.status === "confirmed";

  const handle = async (action: "accept" | "decline" | "complete") => {
    setLoading(action);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (action === "accept" && onAccept) await onAccept(item.id);
      else if (action === "decline" && onDecline) await onDecline(item.id);
      else if (action === "complete" && onComplete) await onComplete(item.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.patient_name?.charAt(0) ?? "?"}
            </Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.patient_name}
          </Text>
          <View style={styles.row}>
            <Feather
              name={item.type === "video" ? "video" : "user"}
              size={12}
              color={colors.mutedForeground}
            />
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

      {(isPending || isConfirmed) && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {isPending && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.declineBtn, { borderColor: colors.border }]}
                onPress={() => handle("decline")}
                disabled={!!loading}
                activeOpacity={0.8}
              >
                {loading === "decline" ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Text style={[styles.btnText, { color: colors.destructive }]}>Decline</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                onPress={() => handle("accept")}
                disabled={!!loading}
                activeOpacity={0.8}
              >
                {loading === "accept" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.btnText, { color: "#fff" }]}>Accept</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          {isConfirmed && (
            <TouchableOpacity
              style={[styles.btn, styles.completeBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => handle("complete")}
              disabled={!!loading}
              activeOpacity={0.8}
            >
              {loading === "complete" ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.btnText, { color: colors.primary }]}>Mark Complete</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  avatarWrap: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  fee: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    borderWidth: 1,
  },
  acceptBtn: {},
  completeBtn: {},
  btnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
