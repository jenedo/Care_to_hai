import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type CompletedAppointment = {
  id: string;
  doctor_name?: string;
  doctor_specialty?: string;
  date_time?: string;
  notes?: string | null;
  amount?: number;
  status: string;
};

function formatDate(dt?: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PrescriptionsScreen() {
  const colors = useColors();
  const { patient, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [records, setRecords] = useState<CompletedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!patient || !token) { setLoading(false); return; }
    try {
      const url = new URL(`${API_BASE}/api/appointments`);
      url.searchParams.set("patient_id", patient.id);
      url.searchParams.set("limit", "100");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const all: CompletedAppointment[] = data?.data ?? [];
        setRecords(all.filter((a) => a.status === "completed"));
      }
    } catch {}
    setLoading(false);
  }, [patient, token]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        {records.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No prescriptions yet"
            subtitle="Prescriptions from your completed consultations will appear here."
          />
        ) : (
          records.map((rec) => {
            const isOpen = expanded === rec.id;
            return (
              <TouchableOpacity
                key={rec.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setExpanded(isOpen ? null : rec.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.rxIcon, { backgroundColor: colors.primaryLight }]}>
                    <Feather name="file-text" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.doctorName, { color: colors.foreground }]} numberOfLines={1}>
                      {rec.doctor_name ?? "Doctor"}
                    </Text>
                    {rec.doctor_specialty && (
                      <Text style={[styles.specialty, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {rec.doctor_specialty}
                      </Text>
                    )}
                    <Text style={[styles.date, { color: colors.mutedForeground }]}>
                      {formatDate(rec.date_time)}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    {rec.amount != null && (
                      <Text style={[styles.fee, { color: colors.primary }]}>
                        PKR {rec.amount.toLocaleString()}
                      </Text>
                    )}
                    <Feather
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </View>
                </View>

                {isOpen && (
                  <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                    {rec.notes ? (
                      <View style={styles.bodySection}>
                        <Text style={[styles.bodyLabel, { color: colors.primary }]}>Doctor Notes</Text>
                        <Text style={[styles.bodyText, { color: colors.foreground }]}>{rec.notes}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                        No notes recorded for this consultation.
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.viewBtn, { borderColor: colors.primary }]}
                      onPress={() => router.push(`/appointment/${rec.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.viewBtnText, { color: colors.primary }]}>View Full Details</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  inner: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  rxIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  doctorName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  specialty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fee: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardBody: { borderTopWidth: 1, padding: 16, gap: 12 },
  bodySection: { gap: 4 },
  bodyLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  viewBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  viewBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
