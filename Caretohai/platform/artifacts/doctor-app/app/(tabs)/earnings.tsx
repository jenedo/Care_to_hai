import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

type EarningsData = {
  today: number;
  week: number;
  month: number;
  total: number;
  available_balance: number;
  rating: number | null;
  total_reviews: number;
  appointments_completed: number;
  pending_payouts: Array<{
    id: string;
    amount: number;
    status: string;
    requested_at: string;
    wallet_provider?: string;
    wallet_number?: string;
    bank_name?: string;
  }>;
};

function EarningCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: string }) {
  const colors = useColors();
  const color = accent ?? colors.primary;
  return (
    <View style={[styles.earningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.earningIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.earningValue, { color: colors.foreground }]}>PKR {value.toLocaleString()}</Text>
      <Text style={[styles.earningLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"JAZZCASH" | "EASYPAISA" | "BANK">("JAZZCASH");
  const [walletNumber, setWalletNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctor/earnings`, { headers: authHeaders });
      const json = await res.json();
      if (json?.data) setData(json.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const onRefresh = () => { setRefreshing(true); fetchEarnings(); };

  const submitPayout = async () => {
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0) { Alert.alert("Error", "Valid amount required"); return; }
    if (payoutMethod !== "BANK" && !walletNumber) { Alert.alert("Error", "Wallet number required"); return; }
    if (payoutMethod === "BANK" && (!bankName || !accountNumber)) { Alert.alert("Error", "Bank details required"); return; }

    setSubmitting(true);
    try {
      const body: any = {
        amount: amt,
      };
      if (payoutMethod !== "BANK") {
        body.walletProvider = payoutMethod;
        body.walletNumber = walletNumber;
      } else {
        body.bankName = bankName;
        body.accountTitle = accountTitle;
        body.accountNumber = accountNumber;
      }

      const res = await fetch(`${API_BASE}/api/doctor/payout-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Payout request submitted! Admin will review within 24 hours.");
        setPayoutModal(false);
        setPayoutAmount("");
        setWalletNumber("");
        fetchEarnings();
      } else {
        Alert.alert("Error", json?.error ?? "Failed to submit request");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
    setSubmitting(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
          <Text style={styles.headerTitle}>Earnings</Text>
          {data?.rating != null && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{data.rating.toFixed(1)} · {data.total_reviews} reviews</Text>
            </View>
          )}

          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>PKR {(data?.available_balance ?? 0).toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={[styles.withdrawBtn, { backgroundColor: colors.primary }]}
              onPress={() => setPayoutModal(true)}
            >
              <Feather name="arrow-up-circle" size={16} color="#fff" />
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          {/* Stats grid */}
          <View style={styles.grid}>
            <EarningCard label="Today" value={data?.today ?? 0} icon="sun" />
            <EarningCard label="This Week" value={data?.week ?? 0} icon="trending-up" accent="#8B5CF6" />
            <EarningCard label="This Month" value={data?.month ?? 0} icon="calendar" accent="#F59E0B" />
            <EarningCard label="Total Earned" value={data?.total ?? 0} icon="award" accent="#10B981" />
          </View>

          {/* Stats row */}
          <View style={[styles.statRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{data?.appointments_completed ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Completed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{data?.total_reviews ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Reviews</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {data?.rating != null ? data.rating.toFixed(1) : "—"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rating</Text>
            </View>
          </View>

          {/* Pending payouts */}
          {(data?.pending_payouts?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pending Payouts</Text>
              {data!.pending_payouts.map(p => (
                <View key={p.id} style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.payoutLeft}>
                    <Text style={[styles.payoutAmount, { color: colors.foreground }]}>PKR {p.amount.toLocaleString()}</Text>
                    <Text style={[styles.payoutMeta, { color: colors.mutedForeground }]}>
                      {p.wallet_provider ?? p.bank_name ?? "Bank"} · {new Date(p.requested_at).toLocaleDateString("en-PK")}
                    </Text>
                  </View>
                  <View style={[styles.payoutBadge, { backgroundColor: "#F59E0B22" }]}>
                    <Text style={[styles.payoutBadgeText, { color: "#F59E0B" }]}>{p.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payout Modal */}
      <Modal visible={payoutModal} transparent animationType="slide" onRequestClose={() => setPayoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request Payout</Text>
              <TouchableOpacity onPress={() => setPayoutModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Amount (PKR)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              keyboardType="numeric"
              placeholder={`Max: PKR ${(data?.available_balance ?? 0).toLocaleString()}`}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Method</Text>
            <View style={styles.methodRow}>
              {(["JAZZCASH", "EASYPAISA", "BANK"] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, payoutMethod === m && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
                  onPress={() => setPayoutMethod(m)}
                >
                  <Text style={[styles.methodBtnText, { color: payoutMethod === m ? "#fff" : colors.foreground }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {payoutMethod !== "BANK" ? (
              <>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Wallet Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={walletNumber}
                  onChangeText={setWalletNumber}
                  keyboardType="phone-pad"
                  placeholder="03XX-XXXXXXX"
                  placeholderTextColor={colors.mutedForeground}
                />
              </>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Bank Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. HBL"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Account Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={accountTitle}
                  onChangeText={setAccountTitle}
                  placeholder="Account holder name"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Account Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  placeholder="XXXXXXXXXXXXXX"
                  placeholderTextColor={colors.mutedForeground}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.7 }]}
              onPress={submitPayout}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  ratingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 18,
  },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginBottom: 4 },
  balanceAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  withdrawBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  body: { padding: 20, gap: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  earningCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "flex-start",
  },
  earningIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  earningValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  earningLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center", gap: 4 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  payoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  payoutLeft: { gap: 2 },
  payoutAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  payoutMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  payoutBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  payoutBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 8 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: -6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  methodRow: { flexDirection: "row", gap: 8 },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  methodBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
