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
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? "1693872f35b14b928ae900e7356c2618";

function buildAudioHtml(appId: string, channel: string, token: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.22.0.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0f172a;width:100vw;height:100vh;overflow:hidden;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:space-between;}
#top{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:24px 0 0;}
#dot{width:9px;height:9px;border-radius:50%;background:#f59e0b;}
#dot.live{background:#10b981;}
#status-txt{color:rgba(255,255,255,0.55);font-size:13px;}
#avatar-section{display:flex;flex-direction:column;align-items:center;gap:14px;}
#avatar{width:140px;height:140px;border-radius:70px;border:3px solid rgba(255,255,255,0.1);background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:64px;}
#caller{font-size:22px;color:#fff;font-weight:700;}
#call-type{font-size:14px;color:rgba(255,255,255,0.45);}
#timer{font-size:18px;color:#10b981;margin-top:4px;}
#rx-row{display:flex;align-items:center;gap:8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:10px 20px;cursor:pointer;}
#rx-row span{color:#10b981;font-size:14px;}
#controls{width:100%;display:flex;align-items:center;justify-content:space-around;padding:24px 40px 44px;}
.ctrl{display:flex;flex-direction:column;align-items:center;gap:8px;}
button{border:none;cursor:pointer;outline:none;}
.ctrl-btn{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.12);font-size:24px;}
.ctrl-btn.active{background:rgba(239,68,68,0.4);}
#btn-end{width:72px;height:72px;border-radius:50%;background:#ef4444;font-size:26px;}
.lbl{color:rgba(255,255,255,0.45);font-size:11px;}
</style>
</head>
<body>
<div id="top"><span id="dot"></span><span id="status-txt">Connecting…</span></div>
<div id="avatar-section">
  <div id="avatar">👤</div>
  <div id="caller">Patient</div>
  <div id="call-type">Audio Call</div>
  <div id="timer" style="display:none">00:00</div>
</div>
<div id="rx-row" onclick="sendRx()"><span>📋</span><span>Write Prescription</span></div>
<div id="controls">
  <div class="ctrl"><button class="ctrl-btn" id="btn-mute" onclick="toggleMute()">🎤</button><span class="lbl">Mute</span></div>
  <div class="ctrl"><button id="btn-end" onclick="hangup()">📵</button><span class="lbl">End</span></div>
  <div class="ctrl"><button class="ctrl-btn" id="btn-spk" onclick="toggleSpk()">🔊</button><span class="lbl">Speaker</span></div>
</div>
<script>
const APP_ID='${appId}',CHANNEL='${channel}',TOKEN='${token}';
let client,localAudio,muted=false,elapsed=0,timerInterval=null;

function post(msg){try{window.ReactNativeWebView.postMessage(JSON.stringify(msg));}catch(e){}}
function sendRx(){post({type:'rx'});}
function hangup(){
  if(timerInterval)clearInterval(timerInterval);
  if(localAudio)localAudio.close();
  if(client)client.leave();
  post({type:'hangup',elapsed});
}
async function toggleMute(){
  muted=!muted;
  if(localAudio)await localAudio.setMuted(muted);
  const b=document.getElementById('btn-mute');
  b.textContent=muted?'🔇':'🎤';
  b.classList.toggle('active',muted);
  document.querySelector('#btn-mute+.lbl').textContent=muted?'Unmute':'Mute';
}
function toggleSpk(){post({type:'speaker'});}
function startTimer(){
  timerInterval=setInterval(()=>{
    elapsed++;
    const m=Math.floor(elapsed/60),s=elapsed%60;
    document.getElementById('timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  },1000);
  document.getElementById('timer').style.display='block';
}
function setStatus(txt,live){
  document.getElementById('status-txt').textContent=txt;
  document.getElementById('dot').className=live?'live':'';
}
async function init(){
  try{
    client=AgoraRTC.createClient({mode:'rtc',codec:'vp8'});
    client.on('user-published',async(user,mediaType)=>{
      await client.subscribe(user,mediaType);
      if(mediaType==='audio'){user.audioTrack.play();setStatus('Connected',true);startTimer();}
    });
    client.on('user-unpublished',()=>setStatus('Patient disconnected',false));
    await client.join(APP_ID,CHANNEL,TOKEN||null,null);
    localAudio=await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([localAudio]);
    setStatus('Waiting for patient…',true);
    post({type:'joined'});
  }catch(e){
    setStatus('Error: '+e.message,false);
    post({type:'error',message:e.message});
  }
}
init();
</script>
</body>
</html>`;
}

export default function AudioCallScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agoraToken, setAgoraToken] = useState<string | null>(null);
  const startedRef = useRef(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agora/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ channelName: sessionId, uid: 0, role: "publisher" }),
      });
      const json = await res.json();
      return json?.data?.token ?? null;
    } catch {
      return null;
    }
  }, [sessionId, token]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchToken().then((t) => {
      if (t) setAgoraToken(t);
      else setError("Could not get call token — check connection");
      setLoading(false);
    });
  }, []);

  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "hangup") {
        try {
          await fetch(`${API_BASE}/api/consultations/${sessionId}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ durationSeconds: msg.elapsed ?? 0 }),
          });
        } catch {}
        router.back();
      }
      if (msg.type === "rx") {
        router.push({ pathname: "/prescription/new", params: { sessionId } });
      }
      if (msg.type === "speaker") {
      }
    } catch {}
  }, [sessionId, token]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: "#0f172a" }]}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={styles.loadingText}>Preparing audio call…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: "#0f172a" }]}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const html = buildAudioHtml(AGORA_APP_ID, sessionId ?? "", agoraToken ?? "");

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
  backBtn: { backgroundColor: "#10B981", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
