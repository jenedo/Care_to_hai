import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetAppointment,
  useUpdateAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={15} color={colors.mutedForeground} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function formatDateTime(dt?: string) {
  if (!dt) return "Not scheduled";
  const d = new Date(dt);
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }) + " at " + d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: raw, isLoading, error } = useGetAppointment(id ?? "");
  const apt = useMemo(() => {
    return (raw as any)?.data ?? raw;
  }, [raw]);

  const updateApt = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
      },
    },
  });

  const doAction = async (status: string, confirmMsg?: string) => {
    if (confirmMsg) {
      Alert.alert("Confirm", confirmMsg, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: status === "cancelled" ? "destructive" : "default",
          onPress: async () => {
            setActionLoading(status);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await updateApt.mutateAsync({ id: id!, data: { status } });
            setActionLoading(null);
            router.back();
          },
        },
      ]);
    } else {
      setActionLoading(status);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateApt.mutateAsync({ id: id!, data: { status } });
      setActionLoading(null);
      router.back();
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !apt) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Appointment not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = apt.status === "pending";
  const isConfirmed = apt.status === "confirmed";
  const dateStr = formatDateTime(apt.date_time ?? apt.scheduled_at);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Card */}
        <View style={[styles.patientCard, { backgroundColor: colors.navBackground }]}>
          <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.patientAvatarText}>
              {apt.patient_name?.charAt(0) ?? "P"}
            </Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{apt.patient_name ?? "Unknown"}</Text>
            <Text style={styles.patientSub}>{apt.type ?? "Consultation"}</Text>
          </View>
          <Badge status={apt.status} />
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>APPOINTMENT DETAILS</Text>
          <InfoRow icon="calendar" label="Date & Time" value={dateStr} />
          <InfoRow icon="video" label="Consultation Type" value={apt.type ?? "Video"} />
          <InfoRow icon="dollar-sign" label="Consultation Fee" value={apt.fee ? `PKR ${apt.fee.toLocaleString()}` : "—"} />
          {apt.notes && <InfoRow icon="file-text" label="Patient Notes" value={apt.notes} />}
        </View>

        {/* Doctor info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>ASSIGNED TO</Text>
          <InfoRow icon="user" label="Doctor" value={apt.doctor_name ?? "—"} />
          <InfoRow icon="activity" label="Specialty" value={apt.doctor_specialty ?? "—"} />
        </View>

        {/* Actions */}
        {(isPending || isConfirmed) && (
          <View style={styles.actions}>
            {isPending && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.destructive }]}
                  onPress={() => doAction("cancelled", "Decline this consultation request?")}
                  disabled={!!actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading === "cancelled" ? (
                    <ActivityIndicator color={colors.destructive} />
                  ) : (
                    <>
                      <Feather name="x-circle" size={18} color={colors.destructive} />
                      <Text style={[styles.actionBtnText, { color: colors.destructive }]}>
                        Decline
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                  onPress={() => doAction("confirmed")}
                  disabled={!!actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading === "confirmed" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={18} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: "#fff" }]}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
            {isConfirmed && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.completeBtn, { backgroundColor: colors.primary }]}
                onPress={() => doAction("completed", "Mark this appointment as completed?")}
                disabled={!!actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading === "completed" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: "#fff" }]}>Mark as Completed</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {apt.status === "completed" && (
          <View style={[styles.completedBanner, { backgroundColor: colors.primaryLight }]}>
            <Feather name="check-circle" size={18} color={colors.primary} />
            <Text style={[styles.completedText, { color: colors.primaryDark }]}>
              Appointment completed
            </Text>
          </View>
        )}

        {apt.status === "cancelled" && (
          <View style={[styles.completedBanner, { backgroundColor: "#fee2e2" }]}>
            <Feather name="x-circle" size={18} color={colors.destructive} />
            <Text style={[styles.completedText, { color: colors.destructive }]}>
              Appointment cancelled
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  content: { padding: 16, gap: 12 },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 18,
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  patientSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textTransform: "capitalize",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  declineBtn: {
    borderWidth: 2,
  },
  acceptBtn: {},
  completeBtn: {},
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  completedText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  back: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
