import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DoctorCard, DoctorItem } from "@/components/DoctorCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const CITIES = ["All", "Karachi", "Lahore", "Islamabad", "Multan", "Peshawar"];

export default function DoctorsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctors?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data?.data ?? []);
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDoctors();
    setRefreshing(false);
  };

  const filtered = doctors.filter((d) => {
    const matchesSearch = !search.trim() || (
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase()) ||
      (d.city ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const matchesCity = cityFilter === "All" || (d.city ?? "") === cityFilter;
    return matchesSearch && matchesCity;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, specialty or city…"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Feather name="x" size={16} color={colors.mutedForeground} onPress={() => setSearch("")} />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.cityBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.cityContent}
      >
        {CITIES.map((city) => (
          <TouchableOpacity
            key={city}
            style={[
              styles.cityChip,
              {
                backgroundColor: cityFilter === city ? colors.primary : colors.card,
                borderColor: cityFilter === city ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setCityFilter(city)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.cityText,
                { color: cityFilter === city ? "#fff" : colors.mutedForeground },
              ]}
            >
              {city}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="user-check"
            title={search || cityFilter !== "All" ? "No doctors found" : "No doctors available"}
            subtitle={
              search ? `No results for "${search}"`
              : cityFilter !== "All" ? `No doctors in ${cityFilter}`
              : "Doctors will appear here."
            }
          />
        ) : (
          filtered.map((doc) => (
            <DoctorCard
              key={doc.id}
              item={doc}
              onPress={() => router.push(`/doctor/${doc.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  cityBar: { maxHeight: 52, borderBottomWidth: 1 },
  cityContent: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  cityText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { flex: 1 },
  listContent: { padding: 16 },
});
