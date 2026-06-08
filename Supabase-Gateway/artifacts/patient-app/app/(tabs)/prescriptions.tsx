import { Feather } from "@expo/vector-icons";
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

type Prescription = {
  id: string;
  appointmentId: string;
  doctorName?: string;
  diagnosis?: string;
  medications?: string;
  instructions?: string;
  createdAt?: string;
  issuedAt?: string;
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

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!patient || !token) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/prescriptions?patient_id=${patient.id}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data?.data?.items ?? data?.data ?? []);
      }
    } catch {}
    setLoading(false);
  }, [patient, token]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions();
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
        {prescriptions.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No prescriptions yet"
            subtitle="Prescriptions from your completed appointments will appear here."
          />
        ) : (
          prescriptions.map((rx) => {
            const isOpen = expanded === rx.id;
            return (
              <TouchableOpacity
                key={rx.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setExpanded(isOpen ? null : rx.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.rxIcon, { backgroundColor: colors.primaryLight }]}>
                    <Feather name="file-text" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    {rx.doctorName && (
                      <Text style={[styles.doctorName, { color: colors.foreground }]} numberOfLines={1}>
                        Dr. {rx.doctorName}
                      </Text>
                    )}
                    {rx.diagnosis && (
                      <Text style={[styles.diagnosis, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {rx.diagnosis}
                      </Text>
                    )}
                    <Text style={[styles.date, { color: colors.mutedForeground }]}>
                      {formatDate(rx.createdAt ?? rx.issuedAt)}
                    </Text>
                  </View>
                  <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </View>

                {isOpen && (
                  <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                    {rx.medications && (
                      <View style={styles.bodySection}>
                        <Text style={[styles.bodyLabel, { color: colors.primary }]}>Medications</Text>
                        <Text style={[styles.bodyText, { color: colors.foreground }]}>{rx.medications}</Text>
                      </View>
                    )}
                    {rx.instructions && (
                      <View style={styles.bodySection}>
                        <Text style={[styles.bodyLabel, { color: colors.primary }]}>Instructions</Text>
                        <Text style={[styles.bodyText, { color: colors.foreground }]}>{rx.instructions}</Text>
                      </View>
                    )}
                    {!rx.medications && !rx.instructions && (
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                        No details available.
                      </Text>
                    )}
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
  doctorName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  diagnosis: { fontSize: 13, fontFamily: "Inter_400Regular" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardBody: { borderTopWidth: 1, padding: 16, gap: 12 },
  bodySection: { gap: 4 },
  bodyLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
