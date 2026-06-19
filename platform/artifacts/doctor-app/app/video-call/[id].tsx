import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? "";

function buildCallHtml(livekitUrl: string, token: string, isVideo: boolean) {
  const safeUrl = JSON.stringify(livekitUrl);
  const safeToken = JSON.stringify(token);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<script src="https://cdn.jsdelivr.net/npm/livekit-client@2.9.9/dist/livekit-client.umd.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0f172a;width:100vw;height:100vh;overflow:hidden;font-family:sans-serif;}
#remote{width:100%;height:100%;background:#1e293b;position:relative;}
#remote video{width:100%;height:100%;object-fit:cover;}
#local{position:absolute;top:16px;right:16px;width:110px;height:150px;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,0.4);background:#0f172a;z-index:2;}
#local video{width:100%;height:100%;object-fit:cover;}
#status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:16px;text-align:center;padding:20px;z-index:1;}
#controls{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:16px;background:rgba(0,0,0,0.6);padding:20px 20px 34px;z-index:3;}
button{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;outline:none;}
#btn-mute{background:rgba(255,255,255,0.15);}
#btn-cam{background:rgba(255,255,255,0.15);}
#btn-flip{background:rgba(255,255,255,0.15);}
#btn-end{width:64px;height:64px;background:#ef4444;}
.active{background:rgba(239,68,68,0.5)!important;}
#rx-btn{position:absolute;top:16px;left:16px;background:rgba(14,165,233,0.85);color:#fff;border:none;border-radius:20px;padding:8px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;z-index:3;}
#pill{position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.5);color:#fff;border-radius:20px;padding:6px 14px;font-size:12px;display:flex;align-items:center;gap:6px;z-index:3;}
#dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;}
#dot.live{background:#10b981;}
</style>
</head>
<body>
<div id="remote"><div id="status">Connecting to call…</div></div>
${isVideo ? '<div id="local"></div>' : ''}
<div id="pill"><span id="dot"></span><span id="pill-txt">Connecting…</span></div>
<button id="rx-btn" onclick="sendRx()">📋 Rx</button>
<div id="controls">
  <button id="btn-mute" onclick="toggleMute()">🎤</button>
  ${isVideo ? '<button id="btn-cam" onclick="toggleCam()">📷</button><button id="btn-flip" onclick="flipCam()">🔄</button>' : '<button id="btn-spk" onclick="toggleSpk()">🔊</button>'}
  <button id="btn-end" onclick="hangup()">📵</button>
</div>
<script>
const LIVEKIT_URL = ${safeUrl};
const TOKEN = ${safeToken};
const IS_VIDEO = ${isVideo};
const { Room, RoomEvent, Track } = LivekitClient;

let room = null, muted = false, camOff = false;

function post(msg){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }catch(e){} }
function sendRx(){ post({type:'rx'}); }
function hangup(){
  if(room){ room.disconnect(); room = null; }
  post({type:'hangup'});
}
function setPill(text,live){
  document.getElementById('pill-txt').textContent=text;
  document.getElementById('dot').className=live?'live':'';
}
async function toggleMute(){
  muted=!muted;
  if(room) await room.localParticipant.setMicrophoneEnabled(!muted);
  document.getElementById('btn-mute').textContent=muted?'🔇':'🎤';
  document.getElementById('btn-mute').classList.toggle('active',muted);
}
async function toggleCam(){
  camOff=!camOff;
  if(room) await room.localParticipant.setCameraEnabled(!camOff);
  document.getElementById('btn-cam').textContent=camOff?'📵':'📷';
  document.getElementById('btn-cam').classList.toggle('active',camOff);
}
async function flipCam(){
  const pub = room?.localParticipant?.getTrackPublication(Track.Source.Camera);
  const track = pub?.track;
  if(track && typeof track.restartTrack === 'function'){
    await track.restartTrack({ facingMode: 'environment' });
  }
}
function toggleSpk(){ post({type:'speaker'}); }

async function init(){
  try{
    room = new Room({ adaptiveStream: true, dynacast: true });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if(track.kind === Track.Kind.Video){
        const el = track.attach();
        document.getElementById('remote').appendChild(el);
        document.getElementById('status').style.display='none';
      }
      if(track.kind === Track.Kind.Audio) track.attach();
      setPill('Live · ${isVideo ? "Video" : "Audio"}', true);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach(el => el.remove());
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      document.getElementById('status').textContent='Patient left the call';
      document.getElementById('status').style.display='block';
      setPill('Patient disconnected', false);
    });
    await room.connect(LIVEKIT_URL, TOKEN);
    await room.localParticipant.setMicrophoneEnabled(true);
    if(IS_VIDEO){
      await room.localParticipant.setCameraEnabled(true);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if(pub?.track){
        const el = pub.track.attach();
        document.getElementById('local').appendChild(el);
      }
    }
    setPill('Waiting for patient…', true);
    post({type:'joined'});
  }catch(e){
    document.getElementById('status').textContent='Failed: '+(e.message||e);
    document.getElementById('status').style.display='block';
    post({type:'error',message:e.message||String(e)});
  }
}
init();
</script>
</body>
</html>`;
}

type CallSession = { token: string; url: string } | null;

export default function VideoCallScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callSession, setCallSession] = useState<CallSession>(null);
  const startedRef = useRef(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchToken = useCallback(async (): Promise<CallSession> => {
    try {
      const res = await fetch(`${API_BASE}/api/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ roomName: sessionId, participantName: "Doctor" }),
      });
      const json = await res.json();
      const callToken = json?.data?.token;
      const url = json?.data?.url ?? LIVEKIT_URL;
      if (!callToken || !url) return null;
      return { token: callToken, url };
    } catch {
      return null;
    }
  }, [sessionId, token]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchToken().then((session) => {
      if (session) setCallSession(session);
      else setError("Could not get call token — check LiveKit config and connection");
      setLoading(false);
    });
  }, [fetchToken]);

  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "hangup") {
        try {
          await fetch(`${API_BASE}/api/consultations/${sessionId}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ durationSeconds: 0 }),
          });
        } catch {}
        router.back();
      }
      if (msg.type === "rx") {
        router.push({ pathname: "/prescription/new", params: { sessionId, patientId: "" } });
      }
    } catch {}
  }, [sessionId, token]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: "#0f172a" }]}>
        <ActivityIndicator color="#0EA5E9" size="large" />
        <Text style={styles.loadingText}>Preparing video call…</Text>
      </View>
    );
  }

  if (error || !callSession) {
    return (
      <View style={[styles.center, { backgroundColor: "#0f172a" }]}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error ?? "Call unavailable"}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const html = buildCallHtml(callSession.url, callSession.token, true);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowsAirPlayForMediaPlayback={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },
  webview: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  loadingText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: { color: "#EF4444", fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  backBtn: { backgroundColor: "#0EA5E9", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
