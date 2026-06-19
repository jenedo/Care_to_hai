import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
const FREE_LIMIT = 120;

type Message = {
  id: string;
  senderRole: "PATIENT" | "DOCTOR";
  senderName: string;
  content: string;
  createdAt: string;
};

type Session = {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  status: string;
  isFreeTrial: boolean;
  isPaid: boolean;
  durationSeconds: number;
  freeSecondsLimit: number;
};

export default function DoctorConsultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { doctor, token } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${id}`, { headers: authHeaders });
      const data = await res.json();
      if (data?.data) {
        setSession(data.data);
        setMessages(data.data.messages ?? []);
        setElapsed(data.data.durationSeconds ?? 0);
      }
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Chat timer — only for CHAT type
  useEffect(() => {
    if (!session || session.status !== "ACTIVE" || session.type !== "CHAT") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        const limit = session.freeSecondsLimit ?? FREE_LIMIT;
        if (!session.isPaid && next >= limit - 10 && next < limit) setShowWarning(true);
        if (!session.isPaid && next >= limit) {
          setFrozen(true);
          setShowWarning(false);
          clearInterval(timerRef.current!);
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status, session?.type, session?.isPaid]);

  // Message polling — only for CHAT
  useEffect(() => {
    if (!session?.id || session.status !== "ACTIVE" || session.type !== "CHAT") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/consultations/${session.id}/messages`, { headers: authHeaders });
        const data = await res.json();
        if (Array.isArray(data?.data)) setMessages(data.data);
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session?.id, session?.status, session?.type]);

  const startSession = async () => {
    if (!session) return;
    const res = await fetch(`${API_BASE}/api/consultations/${session.id}/start`, {
      method: "PATCH", headers: authHeaders,
    });
    const data = await res.json();
    if (data?.data) setSession(data.data);
  };

  const sendMessage = async () => {
    if (!input.trim() || !session || frozen) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${session.id}/messages`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data?.data) {
        setMessages(prev => [...prev, data.data]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {}
    setSending(false);
  };

  const completeSession = async () => {
    Alert.alert("End Consultation", "Are you sure you want to end this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Session", style: "destructive",
        onPress: async () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (pollRef.current) clearInterval(pollRef.current);
          await fetch(`${API_BASE}/api/consultations/${session!.id}/complete`, {
            method: "PATCH", headers: authHeaders,
            body: JSON.stringify({ durationSeconds: elapsed }),
          });
          router.back();
        },
      },
    ]);
  };

  const limit = session?.freeSecondsLimit ?? FREE_LIMIT;
  const remaining = Math.max(0, limit - elapsed);
  const remMins = Math.floor(remaining / 60);
  const remSecs = remaining % 60;
  const timerColor = remaining <= 10 ? "#EF4444" : remaining <= 30 ? "#F59E0B" : "#10B981";

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!session) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.foreground }}>Session not found</Text></View>;
  }

  // VIDEO / AUDIO — show start call UI
  if (session.type === "VIDEO" || session.type === "AUDIO") {
    const isVideo = session.type === "VIDEO";
    return (
      <View style={[styles.callLaunch, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.callHeader, { backgroundColor: colors.navBackground }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.callHeaderTitle}>
            {isVideo ? "Video" : "Audio"} Consultation
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.callLaunchBody}>
          <View style={[styles.callTypeIcon, { backgroundColor: isVideo ? "#0EA5E915" : "#10B98115" }]}>
            <Feather name={isVideo ? "video" : "phone"} size={52} color={isVideo ? "#0EA5E9" : "#10B981"} />
          </View>
          <Text style={[styles.callTypeLabel, { color: colors.foreground }]}>
            {isVideo ? "Video Call Session" : "Audio Call Session"}
          </Text>
          <Text style={[styles.callTypeSub, { color: colors.mutedForeground }]}>
            {session.status === "WAITING" ? "Patient is waiting. Start the session to begin the call." : "Tap below to join the call."}
          </Text>

          {session.status === "WAITING" && (
            <TouchableOpacity
              style={[styles.startCallBtn, { backgroundColor: colors.primary }]}
              onPress={startSession}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.startCallBtnText}>Accept & Start</Text>
            </TouchableOpacity>
          )}

          {session.status === "ACTIVE" && (
            <TouchableOpacity
              style={[styles.startCallBtn, { backgroundColor: isVideo ? "#0EA5E9" : "#10B981" }]}
              onPress={() =>
                router.push({
                  pathname: isVideo ? "/video-call/[id]" : "/audio-call/[id]",
                  params: { id: session.id },
                })
              }
            >
              <Feather name={isVideo ? "video" : "phone"} size={18} color="#fff" />
              <Text style={styles.startCallBtnText}>Join {isVideo ? "Video" : "Audio"} Call</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.prescriptionOutlineBtn, { borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/prescription/new", params: { sessionId: session.id, patientId: session.patientId } })}
          >
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={[styles.prescriptionOutlineBtnText, { color: colors.primary }]}>Write Prescription</Text>
          </TouchableOpacity>

          {session.status === "ACTIVE" && (
            <TouchableOpacity onPress={completeSession}>
              <Text style={[styles.endSessionText, { color: colors.destructive }]}>End Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // CHAT session
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Chat Consultation</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: session.status === "ACTIVE" ? "#10B981" : "#F59E0B" }]} />
            <Text style={styles.statusText}>{session.status}</Text>
          </View>
        </View>

        {/* 2-min timer */}
        {session.status === "ACTIVE" && !session.isPaid && (
          <View style={[styles.timerPill, { backgroundColor: timerColor + "25" }]}>
            <Feather name="clock" size={12} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>
              {remMins}:{String(remSecs).padStart(2, "0")}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.rxBtn}
          onPress={() => router.push({ pathname: "/prescription/new", params: { sessionId: session.id, patientId: session.patientId } })}
        >
          <Feather name="file-text" size={14} color="#fff" />
          <Text style={styles.rxBtnText}>Rx</Text>
        </TouchableOpacity>

        {session.status === "ACTIVE" && (
          <TouchableOpacity onPress={completeSession} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 10-sec warning banner */}
      {showWarning && (
        <View style={[styles.warningBanner, { backgroundColor: "#FEF3C7" }]}>
          <Feather name="alert-triangle" size={14} color="#D97706" />
          <Text style={styles.warningText}>Free time ending in {remaining}s — patient must pay to continue</Text>
        </View>
      )}

      {/* Frozen overlay */}
      {frozen && (
        <View style={[styles.frozenBanner, { backgroundColor: "#FEE2E2" }]}>
          <Feather name="lock" size={14} color="#DC2626" />
          <Text style={styles.frozenText}>Free session time ended. Patient needs to pay to continue.</Text>
        </View>
      )}

      {/* Accept waiting session */}
      {session.status === "WAITING" && (
        <View style={[styles.waitingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.waitingIcon, { backgroundColor: "#D1FAE5" }]}>
            <Feather name="user" size={28} color="#10B981" />
          </View>
          <Text style={[styles.waitingTitle, { color: colors.foreground }]}>Patient is waiting</Text>
          <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>
            {session.isFreeTrial ? "Free trial · 2 min" : session.isPaid ? "Paid session" : "Subscription session"}
          </Text>
          <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.primary }]} onPress={startSession}>
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.acceptBtnText}>Accept & Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.list}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          session.status === "ACTIVE" ? (
            <View style={styles.emptyChat}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>Waiting for patient…</Text>
            </View>
          ) : null
        }
        renderItem={({ item: msg }) => {
          const isMe = msg.senderRole === "DOCTOR";
          return (
            <View style={[styles.msgWrapper, isMe && styles.msgRight]}>
              <View style={[
                styles.msgBubble,
                isMe
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}>
                {!isMe && <Text style={[styles.msgSender, { color: colors.mutedForeground }]}>{msg.senderName ?? "Patient"}</Text>}
                <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>{msg.content}</Text>
                <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                  {new Date(msg.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      {session.status === "ACTIVE" && (
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          {frozen ? (
            <View style={[styles.frozenInput, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={14} color={colors.mutedForeground} />
              <Text style={[styles.frozenInputText, { color: colors.mutedForeground }]}>Session paused — waiting for payment</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={input}
                onChangeText={setInput}
                placeholder="Type a reply…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
                onPress={sendMessage}
                disabled={!input.trim() || sending || frozen}
              >
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  timerPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  timerText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  rxBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(14,165,233,0.7)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  rxBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  endBtn: { backgroundColor: "#10B98120", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  endBtnText: { color: "#10B981", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  warningText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#D97706", flex: 1 },
  frozenBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  frozenText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#DC2626", flex: 1 },
  waitingBox: { margin: 20, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 10 },
  waitingIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  waitingTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  waitingSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  acceptBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  acceptBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { flex: 1 },
  emptyChat: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyChatText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  msgWrapper: { flexDirection: "row", justifyContent: "flex-start" },
  msgRight: { justifyContent: "flex-end" },
  msgBubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  msgSender: { fontSize: 11, fontFamily: "Inter_500Medium" },
  msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgTime: { fontSize: 10, textAlign: "right", marginTop: 2 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  frozenInput: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20 },
  frozenInputText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  callLaunch: { flex: 1 },
  callHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16 },
  callHeaderTitle: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  callLaunchBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  callTypeIcon: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  callTypeLabel: { fontSize: 22, fontFamily: "Inter_700Bold" },
  callTypeSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  startCallBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  startCallBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  prescriptionOutlineBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  prescriptionOutlineBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  endSessionText: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 8 },
});
