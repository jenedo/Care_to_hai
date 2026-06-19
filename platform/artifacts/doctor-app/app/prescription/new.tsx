import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

type Medicine = {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  instructions: string;
};

const TIMINGS = ["Morning", "Afternoon", "Evening", "Night", "Morning & Night", "3x Daily", "As needed"];

function MedicineRow({
  medicine,
  index,
  onChange,
  onRemove,
}: {
  medicine: Medicine;
  index: number;
  onChange: (index: number, field: keyof Medicine, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.medicineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.medicineHeader}>
        <Text style={[styles.medicineNum, { color: colors.primary }]}>Medicine {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        placeholder="Medicine name *"
        placeholderTextColor={colors.mutedForeground}
        value={medicine.name}
        onChangeText={v => onChange(index, "name", v)}
      />
      <View style={styles.row2}>
        <TextInput
          style={[styles.input, styles.flex1, { color: colors.foreground, borderColor: colors.border }]}
          placeholder="Dosage (e.g. 500mg)"
          placeholderTextColor={colors.mutedForeground}
          value={medicine.dosage}
          onChangeText={v => onChange(index, "dosage", v)}
        />
        <TextInput
          style={[styles.input, styles.flex1, { color: colors.foreground, borderColor: colors.border }]}
          placeholder="Duration (e.g. 7 days)"
          placeholderTextColor={colors.mutedForeground}
          value={medicine.duration}
          onChangeText={v => onChange(index, "duration", v)}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timingRow}>
        {TIMINGS.map(t => (
          <TouchableOpacity
            key={t}
            style={[
              styles.timingChip,
              medicine.timing === t && { backgroundColor: colors.primary },
              { borderColor: medicine.timing === t ? colors.primary : colors.border },
            ]}
            onPress={() => onChange(index, "timing", t)}
          >
            <Text style={[styles.timingChipText, { color: medicine.timing === t ? "#fff" : colors.mutedForeground }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        placeholder="Special instructions (optional)"
        placeholderTextColor={colors.mutedForeground}
        value={medicine.instructions}
        onChangeText={v => onChange(index, "instructions", v)}
      />
    </View>
  );
}

export default function PrescriptionNewScreen() {
  const { sessionId, patientId, patientName: pName } = useLocalSearchParams<{
    sessionId?: string;
    patientId?: string;
    patientName?: string;
  }>();
  const { token, doctor } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [diagnosis, setDiagnosis] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", timing: "Morning", duration: "", instructions: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const addMedicine = () => {
    setMedicines(prev => [...prev, { name: "", dosage: "", timing: "Morning", duration: "", instructions: "" }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length === 1) return;
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const savePrescription = async () => {
    const filled = medicines.filter(m => m.name.trim());
    if (filled.length === 0) { Alert.alert("Error", "Add at least one medicine"); return; }
    if (!patientId) { Alert.alert("Error", "Patient ID missing"); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/prescriptions`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          patientId,
          sessionId: sessionId ?? null,
          diagnosis: diagnosis.trim() || null,
          medicines: filled,
          followUpDate: followUpDate.trim() || null,
          notes: notes.trim() || null,
          doctorName: doctor?.fullName ? `Dr. ${doctor.fullName}` : null,
          patientName: pName ?? null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert("Saved", "Prescription saved successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", json?.error ?? "Failed to save");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
    setSaving(false);
  };

  const printPrescription = async () => {
    setPrinting(true);
    try {
      const { printAsync } = await import("expo-print");
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8"/>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
            h1 { color: #0EA5E9; font-size: 22px; margin-bottom: 4px; }
            .subtitle { color: #64748B; font-size: 13px; margin-bottom: 24px; }
            .section { margin-bottom: 20px; }
            .label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .value { font-size: 15px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #F1F5F9; padding: 10px 12px; text-align: left; font-size: 12px; color: #64748B; }
            td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
            .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 16px; color: #94A3B8; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>AsaanCare Prescription</h1>
          <p class="subtitle">Dr. ${doctor?.fullName ?? "Doctor"} · ${new Date().toLocaleDateString("en-PK")}</p>
          ${diagnosis ? `<div class="section"><div class="label">Diagnosis</div><div class="value">${diagnosis}</div></div>` : ""}
          <div class="section">
            <div class="label">Medicines</div>
            <table>
              <tr><th>Medicine</th><th>Dosage</th><th>Timing</th><th>Duration</th></tr>
              ${medicines.filter(m => m.name).map(m => `<tr><td>${m.name}</td><td>${m.dosage || "—"}</td><td>${m.timing}</td><td>${m.duration || "—"}</td></tr>`).join("")}
            </table>
          </div>
          ${notes ? `<div class="section"><div class="label">Notes</div><div class="value">${notes}</div></div>` : ""}
          ${followUpDate ? `<div class="section"><div class="label">Follow-up</div><div class="value">${followUpDate}</div></div>` : ""}
          <div class="footer">AsaanCare — صحت آپکے گھر · Generated ${new Date().toLocaleString("en-PK")}</div>
        </body>
        </html>
      `;
      await printAsync({ html });
    } catch (e: any) {
      Alert.alert("Print Error", e?.message ?? "Failed to print");
    }
    setPrinting(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Prescription</Text>
          {pName ? <Text style={styles.headerSub}>For {pName}</Text> : null}
        </View>
        <TouchableOpacity style={styles.printBtn} onPress={printPrescription} disabled={printing}>
          {printing ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="printer" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DIAGNOSIS</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Enter diagnosis (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Medicines */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MEDICINES</Text>
            <TouchableOpacity style={[styles.addMedBtn, { backgroundColor: colors.primary + "18" }]} onPress={addMedicine}>
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addMedBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
          {medicines.map((m, i) => (
            <MedicineRow key={i} medicine={m} index={i} onChange={updateMedicine} onRemove={removeMedicine} />
          ))}
        </View>

        {/* Follow-up */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FOLLOW-UP DATE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="e.g. 2 weeks, 15 Jan 2026"
            placeholderTextColor={colors.mutedForeground}
            value={followUpDate}
            onChangeText={setFollowUpDate}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ADDITIONAL NOTES</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Rest, diet advice, precautions…"
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
          onPress={savePrescription}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Prescription</Text>
            </>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  printBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8 },
  section: { gap: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: -2 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addMedBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addMedBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  medicineCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  medicineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  medicineNum: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row2: { flexDirection: "row", gap: 8 },
  flex1: { flex: 1 },
  timingRow: { flexDirection: "row" },
  timingChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  timingChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
    minHeight: 80,
  },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
