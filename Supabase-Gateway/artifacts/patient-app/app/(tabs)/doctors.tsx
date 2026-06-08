import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DoctorCard, DoctorItem } from "@/components/DoctorCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { API_BASE } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function DoctorsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/doctors?limit=100&verification_status=approved`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data?.data?.items ?? data?.data ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDoctors();
    setRefreshing(false);
  };

  const filtered = search.trim()
    ? doctors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(search.toLowerCase()) ||
          d.specialty.toLowerCase().includes(search.toLowerCase()) ||
          (d.city ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : doctors;

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
          <Feather
            name="x"
            size={16}
            color={colors.mutedForeground}
            onPress={() => setSearch("")}
          />
        )}
      </View>

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
            title={search ? "No doctors found" : "No doctors available"}
            subtitle={search ? `No results for "${search}"` : "Verified doctors will appear here."}
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
  list: { flex: 1 },
  listContent: { padding: 16 },
});
