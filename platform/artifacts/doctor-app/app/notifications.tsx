import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  readAt?: string;
};

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  APPOINTMENT: { icon: "calendar", color: "#0EA5E9" },
  PAYMENT: { icon: "dollar-sign", color: "#10B981" },
  PAYOUT: { icon: "arrow-up-circle", color: "#8B5CF6" },
  REVIEW: { icon: "star", color: "#F59E0B" },
  VERIFICATION: { icon: "shield", color: "#0EA5E9" },
  SUPPORT: { icon: "message-circle", color: "#F97316" },
  SYSTEM: { icon: "bell", color: "#94A3B8" },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctor/notifications`, { headers: authHeaders });
      const json = await res.json();
      if (Array.isArray(json?.data)) setNotifications(json.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/doctor/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders,
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: "READ" } : n)
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_BASE}/api/doctor/notifications/mark-all-read`, {
        method: "POST",
        headers: authHeaders,
      });
      setNotifications(prev => prev.map(n => ({ ...n, status: "READ" })));
    } catch {}
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const unreadCount = notifications.filter(n => n.status !== "READ").length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              tintColor={colors.primary}
            />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="bell-off" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>You're all caught up!</Text>
            </View>
          ) : (
            notifications.map(n => {
              const isUnread = n.status !== "READ";
              const meta = TYPE_ICONS[n.type] ?? TYPE_ICONS.SYSTEM;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: isUnread ? colors.card : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => isUnread && markRead(n.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIcon, { backgroundColor: meta.color + "18" }]}>
                    <Feather name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={styles.notifBody}>
                    <View style={styles.notifTop}>
                      <Text style={[styles.notifTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.notifMsg, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                      {new Date(n.createdAt).toLocaleDateString("en-PK", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  markAllText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  notifIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifBody: { flex: 1, gap: 3 },
  notifTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifMsg: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
