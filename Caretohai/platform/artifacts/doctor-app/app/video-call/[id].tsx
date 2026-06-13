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

function buildCallHtml(appId: string, channel: string, token: string, isVideo: boolean) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.22.0.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0f172a;width:100vw;height:100vh;overflow:hidden;font-family:sans-serif;}
#remote{width:100%;height:100%;background:#1e293b;}
#remote video{width:100%;height:100%;object-fit:cover;}
#local{position:absolute;top:16px;right:16px;width:110px;height:150px;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,0.4);background:#0f172a;}
#local video{width:100%;height:100%;object-fit:cover;}
#status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:16px;text-align:center;padding:20px;}
#controls{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:16px;background:rgba(0,0,0,0.6);padding:20px 20px 34px;}
button{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;outline:none;}
#btn-mute{background:rgba(255,255,255,0.15);}
#btn-cam{background:rgba(255,255,255,0.15);}
#btn-flip{background:rgba(255,255,255,0.15);}
#btn-end{width:64px;height:64px;background:#ef4444;}
.active{background:rgba(239,68,68,0.5)!important;}
#rx-btn{position:absolute;top:16px;left:16px;background:rgba(14,165,233,0.85);color:#fff;border:none;border-radius:20px;padding:8px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;}
#pill{position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.5);color:#fff;border-radius:20px;padding:6px 14px;font-size:12px;display:flex;align-items:center;gap:6px;}
#dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;}
#dot.live{background:#10b981;}
</style>
</head>
<body>
<div id="remote"><div id="status">🔵 Connecting to call…</div></div>
${isVideo ? '<div id="local"></div>' : ''}
<div id="pill"><span id="dot"></span><span id="pill-txt">Connecting…</span></div>
<button id="rx-btn" onclick="sendRx()">📋 Rx</button>
<div id="controls">
  <button id="btn-mute" onclick="toggleMute()">🎤</button>
  ${isVideo ? '<button id="btn-cam" onclick="toggleCam()">📷</button><button id="btn-flip" onclick="flipCam()">🔄</button>' : '<button id="btn-spk" onclick="toggleSpk()">🔊</button>'}
  <button id="btn-end" onclick="hangup()">📵</button>
</div>
<script>
const APP_ID = '${appId}';
const CHANNEL = '${channel}';
const TOKEN = '${token}';
const IS_VIDEO = ${isVideo};

let client, localAudio, localVideo, muted=false, camOff=false;
let cameras=[], camIdx=0;

function post(msg){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }catch(e){} }
function sendRx(){ post({type:'rx'}); }
function hangup(){
  if(localAudio) localAudio.close();
  if(localVideo) localVideo.close();
  if(client) client.leave();
  post({type:'hangup'});
}

async function toggleMute(){
  muted=!muted;
  if(localAudio) await localAudio.setMuted(muted);
  document.getElementById('btn-mute').textContent=muted?'🔇':'🎤';
  document.getElementById('btn-mute').classList.toggle('active',muted);
}
async function toggleCam(){
  camOff=!camOff;
  if(localVideo) await localVideo.setMuted(camOff);
  document.getElementById('btn-cam').textContent=camOff?'📵':'📷';
  document.getElementById('btn-cam').classList.toggle('active',camOff);
}
async function flipCam(){
  camIdx=(camIdx+1)%Math.max(cameras.length,1);
  if(localVideo && cameras[camIdx]) await localVideo.setDevice(cameras[camIdx].deviceId);
}
function toggleSpk(){ post({type:'speaker'}); }

function setPill(text,live){
  document.getElementById('pill-txt').textContent=text;
  document.getElementById('dot').className=live?'live':'';
}

async function init(){
  try{
    client = AgoraRTC.createClient({mode:'rtc',codec:'vp8'});
    client.on('user-published', async(user,mediaType)=>{
      await client.subscribe(user,mediaType);
      if(mediaType==='video'){ user.videoTrack.play('remote'); document.getElementById('status').style.display='none'; }
      if(mediaType==='audio') user.audioTrack.play();
      setPill('Live · ${isVideo ? "Video" : "Audio"}',true);
    });
    client.on('user-unpublished',(user,mediaType)=>{
      document.getElementById('status').textContent='Patient left the call';
      document.getElementById('status').style.display='block';
      setPill('Patient disconnected',false);
    });
    await client.join(APP_ID, CHANNEL, TOKEN||null, null);
    const tracks=[];
    try{
      localAudio = await AgoraRTC.createMicrophoneAudioTrack();
      tracks.push(localAudio);
    }catch(e){ console.warn('mic',e); }
    if(IS_VIDEO){
      try{
        cameras = await AgoraRTC.getCameras();
        localVideo = await AgoraRTC.createCameraVideoTrack();
        localVideo.play('local');
        tracks.push(localVideo);
      }catch(e){ console.warn('cam',e); }
    }
    if(tracks.length) await client.publish(tracks);
    setPill('Waiting for patient…',true);
    post({type:'joined'});
  }catch(e){
    document.getElementById('status').textContent='Failed: '+e.message;
    document.getElementById('status').style.display='block';
    post({type:'error',message:e.message});
  }
}
init();
</script>
</body>
</html>`;
}

export default function VideoCallScreen() {
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

  const html = buildCallHtml(AGORA_APP_ID, sessionId ?? "", agoraToken ?? "", true);

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
