import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const FREE_SECONDS = 120;

type Message = {
  id: string;
  senderRole: "PATIENT" | "DOCTOR";
  senderName: string;
  content: string;
  createdAt: string;
};

type Session = {
  id: string;
  doctorId: string;
  type: string;
  status: string;
  isFreeTrial: boolean;
  isPaid: boolean;
  durationSeconds: number;
};

export default function ConsultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, patient } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [paying, setPaying] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${id}`, { headers });
      const data = await res.json();
      if (data?.data) {
        setSession(data.data);
        setMessages(data.data.messages ?? []);
        if (data.data.durationSeconds > 0) setElapsed(data.data.durationSeconds);
      }
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!session || session.status !== "ACTIVE") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (session.isFreeTrial && !session.isPaid && next >= FREE_SECONDS) {
          clearInterval(timerRef.current!);
          setShowTimeoutModal(true);
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status, session?.isFreeTrial, session?.isPaid]);

  const pollMessages = useCallback(async () => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${session.id}/messages`, { headers });
      const data = await res.json();
      if (Array.isArray(data?.data)) setMessages(data.data);
    } catch {}
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id || session.status !== "ACTIVE") return;
    const poll = setInterval(pollMessages, 3000);
    return () => clearInterval(poll);
  }, [session?.id, session?.status, pollMessages]);

  const startSession = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${session.id}/start`, {
        method: "PATCH", headers,
      });
      const data = await res.json();
      if (data?.data) setSession(data.data);
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || !session) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${session.id}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: text, senderRole: "PATIENT", senderName: patient?.fullName }),
      });
      const data = await res.json();
      if (data?.data) {
        setMessages(prev => [...prev, data.data]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {}
    setSending(false);
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultations/${session!.id}/pay`, {
        method: "PATCH", headers,
      });
      const data = await res.json();
      if (data?.data) {
        setSession(data.data);
        setShowTimeoutModal(false);
        setElapsed(0);
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      }
    } catch {}
    setPaying(false);
  };

  const endSession = async () => {
    Alert.alert("End Session", "Are you sure you want to end this consultation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Session", style: "destructive",
        onPress: async () => {
          if (timerRef.current) clearInterval(timerRef.current);
          await fetch(`${API_BASE}/api/consultations/${session!.id}/complete`, {
            method: "PATCH", headers,
            body: JSON.stringify({ durationSeconds: elapsed }),
          });
          router.back();
        },
      },
    ]);
  };

  const remainingSeconds = Math.max(0, FREE_SECONDS - elapsed);
  const timerColor = remainingSeconds <= 30 ? "#EF4444" : remainingSeconds <= 60 ? "#F59E0B" : "#10B981";

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Session not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={[styles.header, { backgroundColor: colors.navBackground, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Consultation</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: session.status === "ACTIVE" ? "#10B981" : "#F59E0B" }]} />
            <Text style={styles.statusText}>{session.status}</Text>
          </View>
        </View>
        {session.status === "ACTIVE" && session.isFreeTrial && !session.isPaid && (
          <View style={[styles.timerPill, { backgroundColor: timerColor + "30", borderColor: timerColor }]}>
            <Feather name="clock" size={12} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>
              {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
            </Text>
          </View>
        )}
        {session.status === "ACTIVE" && (
          <TouchableOpacity onPress={endSession} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {session.status === "WAITING" && (
        <View style={[styles.waitingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={32} color={colors.primary} />
          <Text style={[styles.waitingTitle, { color: colors.foreground }]}>Ready to start?</Text>
          <Text style={[styles.waitingSubtitle, { color: colors.mutedForeground }]}>
            {session.isFreeTrial
              ? "You have 2 minutes free. Continue for Rs. 75."
              : "This session is covered by your plan."}
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={startSession}
          >
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Start Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.messageList}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          session.status === "ACTIVE" ? (
            <View style={styles.emptyChat}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>Say hello to your doctor!</Text>
            </View>
          ) : null
        }
        renderItem={({ item: msg }) => {
          const isMine = msg.senderRole === "PATIENT";
          return (
            <View style={[styles.msgWrapper, isMine && styles.msgWrapperRight]}>
              <View style={[
                styles.msgBubble,
                isMine
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}>
                {!isMine && (
                  <Text style={[styles.msgSender, { color: colors.mutedForeground }]}>{msg.senderName ?? "Doctor"}</Text>
                )}
                <Text style={[styles.msgText, { color: isMine ? "#fff" : colors.foreground }]}>
                  {msg.content}
                </Text>
                <Text style={[styles.msgTime, { color: isMine ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                  {new Date(msg.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {session.status === "ACTIVE" && (
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showTimeoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="clock" size={28} color="#D97706" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Free time ended</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Your 2-minute free consultation has ended. Continue the chat for{" "}
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>Rs. 75</Text> — paid directly to the doctor.
            </Text>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: colors.primary }]}
              onPress={handlePay}
              disabled={paying}
            >
              {paying ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.payBtnText}>Pay Rs. 75 & Continue</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endSessionBtn, { borderColor: colors.border }]}
              onPress={() => { setShowTimeoutModal(false); endSession(); }}
            >
              <Text style={[styles.endSessionText, { color: colors.mutedForeground }]}>End Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  timerPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  timerText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  endBtn: { backgroundColor: "#EF444420", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  endBtnText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  waitingBox: { margin: 20, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 10 },
  waitingTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  waitingSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  startBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  messageList: { flex: 1 },
  emptyChat: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyChatText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  msgWrapper: { flexDirection: "row", justifyContent: "flex-start" },
  msgWrapperRight: { justifyContent: "flex-end" },
  msgBubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  msgSender: { fontSize: 11, fontFamily: "Inter_500Medium" },
  msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "right" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 12 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  payBtn: { width: "100%", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 4 },
  payBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  endSessionBtn: { width: "100%", paddingVertical: 13, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  endSessionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
