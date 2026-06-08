import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type DoctorDetail = {
  id: string;
  fullName: string;
  specialty: string;
  city?: string;
  consultationFee?: string | number | null;
  rating?: string | number | null;
  verificationStatus?: string;
  appointmentsCompleted?: number;
  pmdcNumber?: string | null;
  qualifications?: string | null;
  experience?: number | null;
  about?: string | null;
  phone?: string | null;
  languages?: string | null;
};

type InfoRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | number | null;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  const colors = useColors();
  if (!value && value !== 0) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{String(value)}</Text>
      </View>
    </View>
  );
}

export default function DoctorDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/doctors/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDoctor(data?.data ?? null);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (error || !doctor) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Doctor not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fee = doctor.consultationFee ? Number(doctor.consultationFee) : null;
  const rating = doctor.rating ? Number(doctor.rating) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.navBackground }]}>
        <View style={styles.heroInner}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>{doctor.fullName.charAt(0)}</Text>
          </View>
          <Text style={styles.heroName}>Dr. {doctor.fullName}</Text>
          <Text style={styles.heroSpecialty}>{doctor.specialty}</Text>
          <View style={styles.heroMeta}>
            {doctor.city && (
              <View style={styles.heroMetaItem}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroMetaText}>{doctor.city}</Text>
              </View>
            )}
            {rating && (
              <View style={styles.heroMetaItem}>
                <Feather name="star" size={13} color="#FBBF24" />
                <Text style={styles.heroMetaText}>{rating.toFixed(1)} rating</Text>
              </View>
            )}
            {(doctor.appointmentsCompleted ?? 0) > 0 && (
              <View style={styles.heroMetaItem}>
                <Feather name="check-circle" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroMetaText}>{doctor.appointmentsCompleted} completed</Text>
              </View>
            )}
          </View>
          {doctor.verificationStatus && (
            <View style={styles.badgeRow}>
              <Badge status={doctor.verificationStatus} size="sm" />
            </View>
          )}
        </View>
      </View>

      {doctor.about && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.aboutText, { color: colors.foreground }]}>{doctor.about}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DETAILS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="credit-card" label="Consultation Fee" value={fee ? `PKR ${fee.toLocaleString()}` : null} />
          <InfoRow icon="award" label="PMDC Number" value={doctor.pmdcNumber} />
          <InfoRow icon="book" label="Qualifications" value={doctor.qualifications} />
          <InfoRow icon="briefcase" label="Experience" value={doctor.experience ? `${doctor.experience} years` : null} />
          <InfoRow icon="globe" label="Languages" value={doctor.languages} />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/appointments")}
          activeOpacity={0.85}
        >
          <Feather name="calendar" size={18} color="#fff" />
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium" },
  heroCard: { marginBottom: 24 },
  heroInner: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  heroSpecialty: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 8 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  badgeRow: { marginTop: 4 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  aboutText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, padding: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  bookBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14 },
  bookBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
