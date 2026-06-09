import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type DoctorDetail = {
  id: string;
  name: string;
  specialty: string;
  city?: string;
  fee?: number | null;
  rating?: number | null;
  total_reviews?: number;
  verification_status?: string;
  appointments_completed?: number;
  pmdc_number?: string | null;
  qualifications?: string[];
  experience_years?: number | null;
  bio?: string | null;
  phone?: string | null;
  is_available_online?: boolean;
  email?: string | null;
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

const AVATAR_COLORS = ["#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const clean = name.replace(/^Dr\.\s*/i, "");
  return clean.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "D";
}

export default function DoctorDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/doctors/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDoctor(data?.data ?? data ?? null);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    })();
  }, [id, token]);

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

  const fee = doctor.fee ?? null;
  const rating = doctor.rating ? Number(doctor.rating) : null;
  const bg = avatarColor(doctor.id);
  const initials = getInitials(doctor.name ?? "D");
  const isOnline = doctor.is_available_online ?? false;
  const quals = doctor.qualifications ?? [];

  const handleBooking = () => {
    Alert.alert(
      "Book Appointment",
      "Booking coming soon! Call us at 0300-SAHATGHAR to schedule with this doctor.",
      [{ text: "OK" }]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.navBackground }]}>
        <View style={styles.heroInner}>
          <View style={[styles.avatar, { backgroundColor: bg }]}>
            <Text style={styles.avatarText}>{initials}</Text>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? "#22C55E" : "#94A3B8" }]} />
          </View>
          <Text style={styles.heroName}>{doctor.name}</Text>
          <Text style={styles.heroSpecialty}>{doctor.specialty}</Text>

          <View style={styles.heroMeta}>
            {doctor.city && (
              <View style={styles.heroMetaItem}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroMetaText}>{doctor.city}</Text>
              </View>
            )}
            {rating != null && (
              <View style={styles.heroMetaItem}>
                <Feather name="star" size={13} color="#FBBF24" />
                <Text style={styles.heroMetaText}>
                  {rating.toFixed(1)}
                  {(doctor.total_reviews ?? 0) > 0 ? ` (${doctor.total_reviews} reviews)` : ""}
                </Text>
              </View>
            )}
            {(doctor.appointments_completed ?? 0) > 0 && (
              <View style={styles.heroMetaItem}>
                <Feather name="check-circle" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroMetaText}>{doctor.appointments_completed} completed</Text>
              </View>
            )}
          </View>

          <View style={styles.badgeRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: doctor.verification_status === "VERIFIED" ? "#D1FAE5" : "#FEF3C7" }
            ]}>
              <Text style={[
                styles.statusText,
                { color: doctor.verification_status === "VERIFIED" ? "#065F46" : "#92400E" }
              ]}>
                {doctor.verification_status ?? "PENDING"}
              </Text>
            </View>
            <View style={[styles.onlineStatus, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <View style={[styles.onlineDotSmall, { backgroundColor: isOnline ? "#22C55E" : "#94A3B8" }]} />
              <Text style={styles.onlineText}>{isOnline ? "Available Online" : "Offline"}</Text>
            </View>
          </View>
        </View>
      </View>

      {fee != null && (
        <View style={styles.section}>
          <View style={[styles.feeCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "30" }]}>
            <Feather name="credit-card" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.feeLabel, { color: colors.mutedForeground }]}>Consultation Fee</Text>
              <Text style={[styles.feeAmount, { color: colors.primary }]}>
                PKR {fee.toLocaleString()} per consultation
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutText, { color: colors.foreground }]}>
            {doctor.bio ?? "No bio available."}
          </Text>
        </View>
      </View>

      {quals.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>QUALIFICATIONS</Text>
          <View style={styles.qualRow}>
            {quals.map((q, i) => (
              <View key={i} style={[styles.qualBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.qualText, { color: colors.foreground }]}>{q}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DETAILS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="award" label="PMDC Number" value={doctor.pmdc_number} />
          <InfoRow icon="briefcase" label="Experience" value={doctor.experience_years ? `${doctor.experience_years} years` : null} />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={handleBooking}
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
  heroCard: { marginBottom: 20 },
  heroInner: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  avatar: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff" },
  onlineDot: { position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#fff" },
  onlineDotSmall: { width: 8, height: 8, borderRadius: 4 },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  heroSpecialty: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 4 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  onlineStatus: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  onlineText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.9)" },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },
  feeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  feeLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  feeAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  aboutText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, padding: 16 },
  qualRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qualBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  qualText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  bookBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  bookBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
