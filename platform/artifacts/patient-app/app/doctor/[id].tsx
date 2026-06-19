import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  fullName?: string;
  specialty: string;
  city?: string;
  fee?: number | null;
  consultationFee?: number | null;
  rating?: number | null;
  total_reviews?: number;
  totalReviews?: number;
  verification_status?: string;
  verificationStatus?: string;
  appointments_completed?: number;
  appointmentsCompleted?: number;
  pmdc_number?: string | null;
  pmdcNumber?: string | null;
  qualifications?: string[];
  experience_years?: number | null;
  experienceYears?: number | null;
  bio?: string | null;
  phone?: string | null;
  is_available_online?: boolean;
  isAvailableOnline?: boolean;
  onlineStatus?: string;
  email?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  ONLINE: "Available Now",
  BUSY: "In a session",
  OFFLINE: "Offline",
};
const STATUS_COLOR: Record<string, string> = {
  ONLINE: "#22C55E",
  BUSY: "#F59E0B",
  OFFLINE: "#94A3B8",
};
const TYPE_OPTIONS: Array<{ key: string; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: "CHAT", label: "Chat", icon: "message-circle" },
  { key: "AUDIO", label: "Audio", icon: "phone" },
  { key: "VIDEO", label: "Video", icon: "video" },
];

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
  const [connecting, setConnecting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [selectedType, setSelectedType] = useState("CHAT");
  const [scheduling, setScheduling] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const loadDoctor = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctors/${id}`, { headers: authHeaders });
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
  }, [id, token]);

  useEffect(() => { loadDoctor(); }, [loadDoctor]);

  // Poll every 20s to keep online status fresh
  useEffect(() => {
    if (!id) return;
    const iv = setInterval(loadDoctor, 20000);
    return () => clearInterval(iv);
  }, [id, loadDoctor]);

  const handleChatNow = async () => {
    if (!token) { Alert.alert("Sign in required", "Please log in to start a consultation."); return; }
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ doctorId: id, type: selectedType }),
      });
      const data = await res.json();
      if (data?.data?.id) {
        router.push(`/consult/${data.data.id}`);
      } else {
        Alert.alert("Could not connect", data?.error ?? "Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setConnecting(false);
  };

  const handleSendRequest = async () => {
    if (!token) { Alert.alert("Sign in required", "Please log in first."); return; }
    if (!scheduleMsg.trim()) { Alert.alert("Add a message", "Please describe what you'd like to discuss."); return; }
    setScheduling(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultation-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ doctorId: id, type: selectedType, message: scheduleMsg.trim() }),
      });
      const data = await res.json();
      if (data?.data?.id) {
        setShowSchedule(false);
        setScheduleMsg("");
        Alert.alert(
          "Request Sent ✓",
          `Dr. ${doctor?.name ?? doctor?.fullName ?? "the doctor"} will see your request when available and accept it. You'll be notified when the session is ready.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", data?.error ?? "Could not send request.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setScheduling(false);
  };

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

  const name = doctor.fullName ?? doctor.name ?? "Doctor";
  const fee = doctor.consultationFee ?? doctor.fee ?? null;
  const rating = doctor.rating ? Number(doctor.rating) : null;
  const bg = avatarColor(doctor.id);
  const initials = getInitials(name);
  const quals = doctor.qualifications ?? [];
  const verStatus = doctor.verificationStatus ?? doctor.verification_status ?? "PENDING";
  const pmdc = doctor.pmdcNumber ?? doctor.pmdc_number;
  const expYears = doctor.experienceYears ?? doctor.experience_years;
  const totalReviews = doctor.totalReviews ?? doctor.total_reviews ?? 0;
  const completedSessions = doctor.appointmentsCompleted ?? doctor.appointments_completed ?? 0;

  const onlineStatus = doctor.onlineStatus ?? (doctor.isAvailableOnline ?? doctor.is_available_online ? "ONLINE" : "OFFLINE");
  const statusColor = STATUS_COLOR[onlineStatus] ?? "#94A3B8";
  const isOnline = onlineStatus === "ONLINE";
  const isBusy = onlineStatus === "BUSY";

  return (
    <View style={[styles.rootWrap, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.navBackground }]}>
          <View style={styles.heroInner}>
            <View style={[styles.avatar, { backgroundColor: bg }]}>
              <Text style={styles.avatarText}>{initials}</Text>
              <View style={[styles.onlineDot, { backgroundColor: statusColor }]} />
            </View>
            <Text style={styles.heroName}>{name}</Text>
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
                    {rating.toFixed(1)}{totalReviews > 0 ? ` (${totalReviews})` : ""}
                  </Text>
                </View>
              )}
              {completedSessions > 0 && (
                <View style={styles.heroMetaItem}>
                  <Feather name="check-circle" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroMetaText}>{completedSessions} sessions</Text>
                </View>
              )}
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: verStatus === "VERIFIED" ? "#D1FAE5" : "#FEF3C7" }]}>
                <Text style={[styles.statusText, { color: verStatus === "VERIFIED" ? "#065F46" : "#92400E" }]}>
                  {verStatus}
                </Text>
              </View>
              <View style={[styles.onlineStatusBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <View style={[styles.onlineDotSmall, { backgroundColor: statusColor }]} />
                <Text style={styles.onlineText}>{STATUS_LABEL[onlineStatus] ?? "Offline"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Session type picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SESSION TYPE</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.typeBtn,
                  {
                    borderColor: selectedType === opt.key ? colors.primary : colors.border,
                    backgroundColor: selectedType === opt.key ? colors.primaryLight : colors.card,
                  }
                ]}
                onPress={() => setSelectedType(opt.key)}
                activeOpacity={0.8}
              >
                <Feather name={opt.icon} size={17} color={selectedType === opt.key ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: selectedType === opt.key ? colors.primary : colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Offline notice */}
        {!isOnline && (
          <View style={[styles.offlineNotice, { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }]}>
            <Feather name={isBusy ? "clock" : "wifi-off"} size={15} color="#92400E" />
            <Text style={styles.offlineNoticeText}>
              {isBusy
                ? "This doctor is currently in a session. Send a request — they'll accept when free."
                : "This doctor is offline. Send a request — they'll accept when they come online."}
            </Text>
          </View>
        )}

        {fee != null && (
          <View style={styles.section}>
            <View style={[styles.feeCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "30" }]}>
              <Feather name="credit-card" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.feeLabel, { color: colors.mutedForeground }]}>Consultation Fee</Text>
                <Text style={[styles.feeAmount, { color: colors.primary }]}>
                  PKR {Number(fee).toLocaleString()} per consultation
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
            {pmdc && (
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
                  <Feather name="award" size={14} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>PMDC Number</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{pmdc}</Text>
                </View>
              </View>
            )}
            {expYears != null && (
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
                  <Feather name="briefcase" size={14} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Experience</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{expYears} years</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        {isOnline ? (
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: colors.primary }]}
            onPress={handleChatNow}
            disabled={connecting}
            activeOpacity={0.85}
          >
            {connecting
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Feather name={selectedType === "VIDEO" ? "video" : selectedType === "AUDIO" ? "phone" : "message-circle"} size={20} color="#fff" />
                  <Text style={styles.connectBtnText}>Connect Now — Free 2 min</Text>
                </>
              )
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.requestBtn, { borderColor: colors.primary }]}
            onPress={() => setShowSchedule(true)}
            activeOpacity={0.85}
          >
            <Feather name="send" size={18} color={colors.primary} />
            <Text style={[styles.requestBtnText, { color: colors.primary }]}>Send Consultation Request</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Schedule request modal */}
      <Modal visible={showSchedule} transparent animationType="slide" onRequestClose={() => setShowSchedule(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request a Session</Text>
              <TouchableOpacity onPress={() => setShowSchedule(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Dr. {name.replace(/^Dr\.\s*/i, "")} will see your request when they come online and accept or reschedule.
            </Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.typeBtn,
                    {
                      borderColor: selectedType === opt.key ? colors.primary : colors.border,
                      backgroundColor: selectedType === opt.key ? colors.primaryLight : colors.background,
                    }
                  ]}
                  onPress={() => setSelectedType(opt.key)}
                  activeOpacity={0.8}
                >
                  <Feather name={opt.icon} size={16} color={selectedType === opt.key ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.typeBtnText, { color: selectedType === opt.key ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.scheduleInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Describe your concern or symptoms…"
              placeholderTextColor={colors.mutedForeground}
              value={scheduleMsg}
              onChangeText={setScheduleMsg}
              multiline
              numberOfLines={4}
              maxLength={400}
            />
            <TouchableOpacity
              style={[styles.connectBtn, { backgroundColor: colors.primary, opacity: scheduling ? 0.7 : 1 }]}
              onPress={handleSendRequest}
              disabled={scheduling}
              activeOpacity={0.85}
            >
              {scheduling
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <>
                    <Feather name="send" size={18} color="#fff" />
                    <Text style={styles.connectBtnText}>Send Request</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrap: { flex: 1 },
  container: { flex: 1 },
  content: { gap: 0 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium" },
  heroCard: { marginBottom: 16 },
  heroInner: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  avatar: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff" },
  onlineDot: { position: "absolute", bottom: 3, right: 3, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: "#fff" },
  onlineDotSmall: { width: 8, height: 8, borderRadius: 4 },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  heroSpecialty: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 4 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  onlineStatusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  onlineText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.9)" },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  offlineNotice: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  offlineNoticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#92400E", lineHeight: 19 },
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
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  connectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 16 },
  connectBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  requestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 16, borderWidth: 2 },
  requestBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  scheduleInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100, textAlignVertical: "top" },
});
