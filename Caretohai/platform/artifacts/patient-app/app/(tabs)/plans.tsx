import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Plan = {
  id: string;
  name: string;
  price: string;
  features: {
    tier: string;
    videoSessions: number;
    audioSessions: number;
    chatSessions: number;
    maxMembers: number;
    payPerUse: boolean;
    features: string[];
    badge: string | null;
  };
};

const PLAN_COLORS: Record<string, string> = {
  Basic: "#6B7280",
  Care: "#10B981",
  Family: "#3B82F6",
  Premium: "#8B5CF6",
};

function SessionBadge({ icon, count, payPerUse }: { icon: string; count: number; payPerUse: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.sessionBadge}>
      <Feather name={icon as any} size={14} color={colors.mutedForeground} />
      <Text style={[styles.sessionValue, payPerUse ? { color: "#EF4444" } : { color: colors.foreground }]}>
        {payPerUse ? "Pay-per-use" : count === 0 ? "—" : `${count} session${count > 1 ? "s" : ""}`}
      </Text>
    </View>
  );
}

export default function PlansScreen() {
  const colors = useColors();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/subscriptions/plans/public`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setPlans(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubscribe = (plan: Plan) => {
    if (plan.name === "Basic") {
      Alert.alert("Basic Plan", "You are already on the Basic (Free) plan.");
      return;
    }
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to subscribe.");
      router.push("/login");
      return;
    }
    Alert.alert(
      `Subscribe to ${plan.name}`,
      `Rs. ${Number(plan.price).toLocaleString("en-PK")}/month\n\nYou will be asked to verify your card (Rs. 0 charge) to prevent abuse. Your first free consultation remains free.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => Alert.alert("Coming Soon", "Secure payment flow will be available shortly."),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: colors.navBackground, paddingTop: insets.top + 16 }]}>
        <Text style={styles.heroTitle}>AsaanCare Plans</Text>
        <Text style={styles.heroSub}>Choose the plan that fits your family's health needs</Text>
        <View style={styles.freeTrialBadge}>
          <Feather name="gift" size={13} color="#10B981" />
          <Text style={styles.freeTrialText}>First consultation free for new users</Text>
        </View>
      </View>

      <View style={styles.plansContainer}>
        {plans.map((plan) => {
          const f = plan.features as Plan["features"];
          const accentColor = PLAN_COLORS[plan.name] ?? colors.primary;
          const isFree = Number(plan.price) === 0;
          const isPopular = plan.name === "Care";

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: isPopular ? accentColor : colors.border },
                isPopular && styles.planCardPopular,
              ]}
            >
              {isPopular && (
                <View style={[styles.popularBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              {f?.badge && !isPopular && (
                <View style={[styles.popularBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.popularText}>{f.badge}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planIconWrap, { backgroundColor: accentColor + "20" }]}>
                  <Feather
                    name={plan.name === "Basic" ? "shield" : plan.name === "Care" ? "heart" : plan.name === "Family" ? "users" : "star"}
                    size={20}
                    color={accentColor}
                  />
                </View>
                <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.planCurrency, { color: colors.mutedForeground }]}>Rs.</Text>
                  <Text style={[styles.planPrice, { color: accentColor }]}>
                    {isFree ? "0" : Number(plan.price).toLocaleString("en-PK")}
                  </Text>
                  <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/month</Text>
                </View>
                {f?.maxMembers > 1 && (
                  <Text style={[styles.membersNote, { color: colors.mutedForeground }]}>
                    Up to {f.maxMembers} family members
                  </Text>
                )}
              </View>

              <View style={[styles.sessionRow, { borderColor: colors.border }]}>
                <Text style={[styles.quotaLabel, { color: colors.mutedForeground }]}>Monthly Quota</Text>
                <SessionBadge icon="video" count={f?.videoSessions ?? 0} payPerUse={isFree} />
                <SessionBadge icon="mic" count={f?.audioSessions ?? 0} payPerUse={isFree} />
                <SessionBadge icon="message-circle" count={f?.chatSessions ?? 0} payPerUse={isFree} />
              </View>

              <View style={styles.featuresList}>
                {(f?.features ?? []).map((feat: string) => (
                  <View key={feat} style={styles.featureRow}>
                    <View style={[styles.checkCircle, { backgroundColor: accentColor + "20" }]}>
                      <Feather name="check" size={11} color={accentColor} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{feat}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeBtn,
                  { backgroundColor: isFree ? colors.muted : accentColor },
                ]}
                onPress={() => handleSubscribe(plan)}
                activeOpacity={0.85}
              >
                <Text style={[styles.subscribeBtnText, { color: isFree ? colors.mutedForeground : "#fff" }]}>
                  {isFree ? "Current Plan" : `Get ${plan.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={[styles.securityNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="lock" size={16} color={colors.primary} />
        <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
          Card verification uses a Rs. 0 authorization charge. We never store your full card details. Secured with bank-grade encryption.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: "center", gap: 6 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", textAlign: "center" },
  freeTrialBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(16,185,129,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  freeTrialText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981" },
  plansContainer: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  planCard: { borderRadius: 20, borderWidth: 1.5, overflow: "hidden", position: "relative" },
  planCardPopular: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  popularBadge: { position: "absolute", top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, zIndex: 1 },
  popularText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  planHeader: { padding: 20, alignItems: "center", gap: 6 },
  planIconWrap: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  planName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  planCurrency: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 4 },
  planPrice: { fontSize: 36, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 6 },
  membersNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  quotaLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  sessionBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  featuresList: { padding: 20, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  subscribeBtn: { marginHorizontal: 20, marginBottom: 20, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  subscribeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  securityNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, margin: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  securityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
