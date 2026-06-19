import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu",
  FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const SLOT_KEYS = ["morning", "afternoon", "evening", "night"] as const;
const SLOT_DEFS = {
  morning: { label: "Morning", start: "08:00", end: "12:00" },
  afternoon: { label: "Afternoon", start: "12:00", end: "16:00" },
  evening: { label: "Evening", start: "16:00", end: "20:00" },
  night: { label: "Night", start: "20:00", end: "23:00" },
};

const DURATIONS = [15, 20, 30, 45, 60] as const;
const CONSULT_TYPES = [
  { key: "ONLINE", label: "Online" },
  { key: "CLINIC", label: "Clinic" },
  { key: "BOTH", label: "Both" },
] as const;

type DaySlots = Record<string, boolean>;
type Schedule = Record<string, DaySlots>;

function defaultSchedule(): Schedule {
  const s: Schedule = {};
  DAYS.forEach(d => {
    s[d] = {};
    SLOT_KEYS.forEach(k => { s[d][k] = false; });
  });
  return s;
}

export default function AvailabilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<Schedule>(defaultSchedule());
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [consultType, setConsultType] = useState<string>("ONLINE");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const loadAvailability = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctor/availability`, { headers: authHeaders });
      const json = await res.json();
      const rows: any[] = json?.data ?? [];
      if (rows.length > 0) {
        const s = defaultSchedule();
        rows.forEach(row => {
          const day = row.dayOfWeek;
          const start = row.startTime;
          for (const [key, def] of Object.entries(SLOT_DEFS)) {
            if (def.start === start) {
              if (s[day]) s[day][key] = row.isActive;
            }
          }
          setSlotDuration(row.slotDurationMinutes ?? 30);
          setConsultType(row.consultationType ?? "ONLINE");
        });
        setSchedule(s);
      }
    } catch {}
    setLoaded(true);
  }, [token]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const toggle = (day: string, slot: string) => {
    Haptics.selectionAsync();
    setSaved(false);
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [slot]: !prev[day][slot] } }));
  };

  const save = async () => {
    setSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const slots: any[] = [];
      DAYS.forEach(day => {
        SLOT_KEYS.forEach(slotKey => {
          if (schedule[day]?.[slotKey]) {
            const def = SLOT_DEFS[slotKey];
            slots.push({
              dayOfWeek: day,
              startTime: def.start,
              endTime: def.end,
              slotDurationMinutes: slotDuration,
              consultationType: consultType,
              isActive: true,
            });
          }
        });
      });
      const res = await fetch(`${API_BASE}/api/doctor/availability`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ slots }),
      });
      if (res.ok) {
        setSaved(true);
        Alert.alert("Saved", "Your availability has been updated.");
      } else {
        Alert.alert("Error", "Failed to save availability");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
    setSaving(false);
  };

  const enabledCount = DAYS.reduce(
    (sum, d) => sum + SLOT_KEYS.filter(s => schedule[d]?.[s]).length, 0
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!loaded) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Schedule Setup</Text>
            <Text style={styles.subtitle}>{enabledCount} slots active</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saved ? "#10B981" : colors.primary }, saving && styles.disabled]}
            onPress={save}
            disabled={saving || saved}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved ? (
              <><Feather name="check" size={16} color="#fff" /><Text style={styles.saveBtnText}>Saved</Text></>
            ) : (
              <><Feather name="save" size={16} color="#fff" /><Text style={styles.saveBtnText}>Save</Text></>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Slot Duration */}
        <View style={styles.optionSection}>
          <Text style={[styles.optionLabel, { color: colors.mutedForeground }]}>SLOT DURATION (MINUTES)</Text>
          <View style={styles.optionRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.optionChip, slotDuration === d && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
                onPress={() => { setSlotDuration(d); setSaved(false); }}
              >
                <Text style={[styles.optionChipText, { color: slotDuration === d ? "#fff" : colors.foreground }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Consultation Type */}
        <View style={styles.optionSection}>
          <Text style={[styles.optionLabel, { color: colors.mutedForeground }]}>CONSULTATION TYPE</Text>
          <View style={styles.optionRow}>
            {CONSULT_TYPES.map(ct => (
              <TouchableOpacity
                key={ct.key}
                style={[styles.optionChip, { flex: 1 }, consultType === ct.key && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
                onPress={() => { setConsultType(ct.key); setSaved(false); }}
              >
                <Text style={[styles.optionChipText, { color: consultType === ct.key ? "#fff" : colors.foreground }]}>{ct.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly Grid */}
        <Text style={[styles.gridLabel, { color: colors.mutedForeground }]}>WEEKLY AVAILABILITY</Text>
        {DAYS.map(day => {
          const dayEnabled = SLOT_KEYS.some(s => schedule[day]?.[s]);
          return (
            <View key={day} style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, { color: dayEnabled ? colors.primary : colors.mutedForeground }]}>
                  {DAY_LABELS[day]}
                </Text>
                {dayEnabled && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.slots}>
                {SLOT_KEYS.map(slotKey => {
                  const on = schedule[day]?.[slotKey] ?? false;
                  return (
                    <TouchableOpacity
                      key={slotKey}
                      style={[
                        styles.slot,
                        on
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                      ]}
                      onPress={() => toggle(day, slotKey)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.slotText, { color: on ? "#fff" : colors.mutedForeground }]}>
                        {SLOT_DEFS[slotKey].label.slice(0, 3)}
                      </Text>
                      <Text style={[styles.slotTime, { color: on ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                        {SLOT_DEFS[slotKey].start}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.tip}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            Tap a slot to toggle. Changes are saved to the database when you press Save.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  disabled: { opacity: 0.7 },
  scroll: { padding: 16, gap: 12, paddingBottom: 100 },
  optionSection: { gap: 8 },
  optionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  optionRow: { flexDirection: "row", gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  optionChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  gridLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 4 },
  dayCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  dayName: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  slots: { flexDirection: "row", gap: 8 },
  slot: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 2 },
  slotText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  slotTime: { fontSize: 9, fontFamily: "Inter_400Regular" },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
