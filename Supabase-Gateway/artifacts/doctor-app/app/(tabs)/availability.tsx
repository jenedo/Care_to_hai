import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["Morning\n8–12", "Afternoon\n12–16", "Evening\n16–20", "Night\n20–23"];
const SLOT_KEYS = ["morning", "afternoon", "evening", "night"];

type Schedule = Record<string, Record<string, boolean>>;

const defaultSchedule = (): Schedule => {
  const s: Schedule = {};
  DAYS.forEach((day) => {
    s[day] = {};
    SLOT_KEYS.forEach((slot) => {
      s[day][slot] = false;
    });
  });
  return s;
};

const STORAGE_KEY = "sahatghar_availability";

export default function AvailabilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState<Schedule>(defaultSchedule());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setSchedule(JSON.parse(stored));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const toggle = (day: string, slot: string) => {
    Haptics.selectionAsync();
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: !prev[day][slot] },
    }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    setSaving(false);
    setSaved(true);
  };

  const enabledCount = DAYS.reduce(
    (sum, d) => sum + SLOT_KEYS.filter((s) => schedule[d]?.[s]).length,
    0
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
            <Text style={styles.title}>Availability</Text>
            <Text style={styles.subtitle}>{enabledCount} time slots enabled</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: saved ? colors.primaryDark : colors.primary },
              saving && styles.disabled,
            ]}
            onPress={save}
            disabled={saving || saved}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved ? (
              <>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Saved</Text>
              </>
            ) : (
              <>
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {SLOTS.map((slot, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>{SLOT_KEYS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {DAYS.map((day) => {
          const dayEnabled = SLOT_KEYS.some((s) => schedule[day]?.[s]);
          return (
            <View
              key={day}
              style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.dayHeader}>
                <Text
                  style={[
                    styles.dayName,
                    { color: dayEnabled ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {day.slice(0, 3)}
                </Text>
                {dayEnabled && (
                  <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={styles.slots}>
                {SLOT_KEYS.map((slot, si) => {
                  const on = schedule[day]?.[slot] ?? false;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slot,
                        on
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
                      ]}
                      onPress={() => toggle(day, slot)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          { color: on ? "#fff" : colors.mutedForeground },
                        ]}
                      >
                        {SLOTS[si].split("\n")[0]}
                      </Text>
                      <Text
                        style={[
                          styles.slotTime,
                          { color: on ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
                        ]}
                      >
                        {SLOTS[si].split("\n")[1]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.tip}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            Tap a slot to toggle availability. Changes only apply after saving.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  disabled: { opacity: 0.7 },
  legend: {
    flexDirection: "row",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textTransform: "capitalize",
  },
  grid: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  dayName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slots: {
    flexDirection: "row",
    gap: 8,
  },
  slot: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  slotText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  slotTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  tipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
});
