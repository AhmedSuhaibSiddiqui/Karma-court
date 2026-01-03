import { useEffect, useState, useRef } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Courtroom from './components/Courtroom';
import CourtOverlay from './components/CourtOverlay';
import LoadingScreen from './components/LoadingScreen';

import { ErrorHandler } from './utils/errorHandler';
import './App.css';

// --- SDK INITIALIZATION ---
let discordSdk: DiscordSDK | null = null;

if (location.search.includes("frame_id")) {
  try {
    discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
  } catch (e) {
    ErrorHandler.handleSDKError(e);
  }
} else {
  console.warn("Running in Browser Mode (No SDK)");
}

// Default Game State
const INITIAL_STATE = {
  votes: { guilty: 0, innocent: 0 },
  voters: [],
  crime: "Waiting for accusation...",
  verdict: null,
  judge_id: null,
  accused: { username: "Unknown", avatar: null },
  witness: { username: null, avatar: null },
  evidence: [],
  logs: []
};

function App() {
  const [auth, setAuth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const didAuth = useRef(false);

  // GAME STATE
  const [gameState, setGameState] = useState<any>(INITIAL_STATE);
  const [isShaking, setIsShaking] = useState(false);
  const [showObjection, setShowObjection] = useState<string | null>(null);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const ws = useRef<WebSocket | null>(null);

  // --- AUTHENTICATION ---
  useEffect(() => {
    const setup = async () => {
      if (didAuth.current) {
        console.log("Auth already in progress (didAuth is true)");
        return; 
      }
      didAuth.current = true;

      if (!discordSdk) {
        setError("Please open this app inside Discord!");
        return;
      }

      try {
        console.log("Waiting for SDK.ready()...");
        await discordSdk.ready();
        console.log("SDK Ready!");

        // Authorize with Discord Client
        console.log("Authorizing...");
        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds", "rpc.voice.read"],
        });
        console.log("Authorized! Code:", code);
        
        // --- VOICE SUBSCRIPTIONS ---
        try {
            const channelId = discordSdk.channelId;
            if (channelId) {
                await discordSdk.subscribe("SPEAKING_START", (event: { user_id: string }) => {
                    setSpeakingUsers(prev => new Set(prev).add(event.user_id));
                }, { channel_id: channelId });
                
                await discordSdk.subscribe("SPEAKING_STOP", (event: { user_id: string }) => {
                    setSpeakingUsers(prev => {
                        const next = new Set(prev);
                        next.delete(event.user_id);
                        return next;
                    });
                }, { channel_id: channelId });
                console.log("Voice events subscribed for channel:", channelId);
            } else {
                console.warn("Channel ID not found, voice events skipped.");
            }
        } catch (e) {
            ErrorHandler.handleSDKError(e);
        }

        // Exchange code for token via backend
        console.log("Exchanging token via backend...");

        // Determine Backend URL (Production vs Local)
        const backendBase = import.meta.env.VITE_BACKEND_URL || ""; 
        // Note: If VITE_BACKEND_URL is set, use it. Otherwise rely on proxy (local).
        
        const tokenUrl = backendBase ? `${backendBase}/api/token` : '/api/token';

        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code,
            redirect_uri: window.location.origin 
          }),
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`Backend Error (${response.status}): ${errText}`);
        }

        const { access_token } = await response.json();
        console.log("Got access token from backend");

        // Authenticate SDK
        console.log("Authenticating SDK...");
        const newAuth = await discordSdk.commands.authenticate({ access_token });
        console.log("Authentication Complete:", newAuth);
        
        setAuth(newAuth);

      } catch (e: any) {
        const errorMsg = ErrorHandler.handleAPIError(e);
        didAuth.current = false; // Reset lock on error
        if (!e.message?.includes("Already authing")) {
            setError(errorMsg);
        }
      }
    };
    
    setup();
  }, []);

  // --- WEBSOCKET & GAME LOGIC ---
  useEffect(() => {
    if (!auth) return;

    // Determine WS URL
    let wsUrl = "";
    if (import.meta.env.VITE_BACKEND_URL) {
      // Production: Replace http/https with ws/wss
      wsUrl = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws');
    } else {
      // Local: Use current window (proxy)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}`;
    }
    
    // Ensure no trailing slash issues
    wsUrl = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl;

    const instanceId = discordSdk?.instanceId || 'default';
    const socket = new WebSocket(`${wsUrl}/ws?user_id=${auth.user.id}&instance_id=${instanceId}`);

    socket.onopen = () => console.log("WebSocket Connected");
    socket.onerror = (e) => ErrorHandler.handleWebSocketError(e);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === "update") {
        setGameState(message.data);
      }
      
      if (message.type === "sound") {
        playSound(message.sound);
      }

      if (message.type === "objection_event") {
        triggerObjectionEffect(message.username);
      }
    };

    ws.current = socket;
    return () => socket.close();
  }, [auth]);

  const playSound = (soundName: string) => {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(() => {}); 
  };

  const triggerObjectionEffect = (username: string) => {
    setIsShaking(true);
    setShowObjection(username);
    setTimeout(() => setIsShaking(false), 500);
    setTimeout(() => setShowObjection(null), 2000);
  };

  // --- ACTIONS ---
  const sendAction = (payload: any) => {
    ws.current?.send(JSON.stringify(payload));
  };

  if (!discordSdk || error) {
    return (
      <div className="app-container">
        <h1 className="error-title">🚧 Development Mode 🚧</h1>
        <p className="error-message">{error || "App running outside Discord."}</p>
      </div>
    );
  }

  if (!auth) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Courtroom 
        currentUser={auth.user}
        discordSdk={discordSdk!}
        gameState={gameState}
        isShaking={isShaking}
        showObjection={showObjection}
        speakingUsers={speakingUsers}
        onVote={(vote) => sendAction({ type: 'vote', vote })}
        onUpdateCrime={(crime) => sendAction({ type: 'update_crime', crime })}
        onGenerateCrime={() => sendAction({ type: 'generate_crime' })}
        onCallVerdict={() => sendAction({ type: 'call_verdict' })}
        onPassSentence={() => sendAction({ type: 'pass_sentence' })}
        onNextCase={() => sendAction({ type: 'next_case' })}
        onAccuseUser={(user) => sendAction({ type: 'accuse_user', user })}
        onCallWitness={(user) => sendAction({ type: 'call_witness', user })}
      />
      
      <CourtOverlay 
        logs={gameState.logs}
        evidence={gameState.evidence}
        onAddEvidence={(text) => sendAction({ type: 'add_evidence', text, username: auth.user.username })}
        onObjection={() => sendAction({ type: 'objection', username: auth.user.username })}
      />
    </>
  );
}

export default App;