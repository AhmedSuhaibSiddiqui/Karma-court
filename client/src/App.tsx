import { useEffect, useState, useRef } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Courtroom from './components/Courtroom';
import CourtOverlay from './components/CourtOverlay';
import LoadingScreen from './components/LoadingScreen';
import MobileNotice from './components/MobileNotice';
import Onboarding from './components/Onboarding/Onboarding';

import { ErrorHandler } from './utils/errorHandler';
import { useFeedback } from './hooks/useFeedback';
import { Analytics } from './services/analytics';
import { useAccessibility } from './hooks/useAccessibility';
import { useRenderCount, PerformanceService } from './services/performance';
import { QualityAssurance } from './tests/sanityChecks';
import type { DiscordUser, GameState } from './types/game';

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
const INITIAL_STATE: GameState = {
  votes: { guilty: 0, innocent: 0 },
  voters: [],
  crime: "",
  verdict: null,
  judge_id: null,
  accused: { username: "Unknown", avatar: null },
  witness: { username: null, avatar: null },
  evidence: [],
  logs: [],
  sentence: null,
  timer: 0
};

interface AuthData {
  user: DiscordUser;
  access_token: string;
}

function App() {
  const { showToast, showError: showToastError } = useFeedback();
  useAccessibility();
  useRenderCount('App');

  const [auth, setAuth] = useState<AuthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('karma_court_onboarded'));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const didAuth = useRef(false);

  // Handle Resize for Mobile Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist Mute State
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('karma_court_mute') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('karma_court_mute', String(isMuted));
  }, [isMuted]);

  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [isShaking, setIsShaking] = useState(false);
  const [showObjection, setShowObjection] = useState<string | null>(null);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  const ws = useRef<WebSocket | null>(null);

  // --- AUTHENTICATION ---
  useEffect(() => {
    // Preload SFX
    ['gavel', 'objection', 'vote', 'evidence'].forEach(sound => {
      const audio = new Audio(`/sounds/${sound}.mp3`);
      audio.load();
    });

    const setup = async () => {
      if (didAuth.current) return;
      didAuth.current = true;

      if (!discordSdk) {
        setError("Please open this app inside Discord!");
        return;
      }

      try {
        await discordSdk.ready();

        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds", "rpc.voice.read"],
        });
        
        const backendBase = import.meta.env.VITE_BACKEND_URL || ""; 
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
        const newAuth = await discordSdk.commands.authenticate({ access_token });
        setAuth(newAuth);

        // --- VOICE SUBSCRIPTIONS (Post-Auth) ---
        try {
            const channelId = discordSdk.channelId;
            const filter = channelId ? { channel_id: channelId } : {};

            await discordSdk.subscribe("SPEAKING_START", (event: { user_id: string }) => {
                setSpeakingUsers(prev => new Set(prev).add(event.user_id));
            }, filter);
            
            await discordSdk.subscribe("SPEAKING_STOP", (event: { user_id: string }) => {
                setSpeakingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(event.user_id);
                    return next;
                });
            }, filter);

        } catch (e) {
            console.error("Voice Subscription Warning:", e);
        }

      } catch (e: unknown) {
        const errorMsg = ErrorHandler.handleAPIError(e);
        didAuth.current = false;
        if (e instanceof Error && !e.message?.includes("Already authing")) {
            setError(errorMsg);
            showToastError(e);
        }
      }
    };
    
    setup();
  }, [showToastError]);

  // --- WEBSOCKET & GAME LOGIC ---
  useEffect(() => {
    if (!auth) return;

    let wsUrl = "";
    if (import.meta.env.VITE_BACKEND_URL) {
      wsUrl = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}`;
    }
    
    wsUrl = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl;
    const instanceId = discordSdk?.instanceId || 'default';
    const socket = new WebSocket(`${wsUrl}/ws?user_id=${auth.user.id}&instance_id=${instanceId}`);

    socket.onopen = () => {};
    socket.onerror = (e) => ErrorHandler.handleWebSocketError(e);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "update") {
        setGameState((prev: GameState) => PerformanceService.getOptimizedGameState(prev, message.data));
        if (message.data.verdict) {
          Analytics.trackEvent('verdict_delivered', { verdict: message.data.verdict });
        }
      }
      if (message.type === "sound") playSound(message.sound);
      if (message.type === "error") {
        showToast(message.message, 'error');
      }
      if (message.type === "objection_event") {
        Analytics.trackEvent('objection_called', { user: message.username });
        triggerObjectionEffect(message.username);
        showToast(`OBJECTION by ${message.username}`, 'warning');
      }
    };

    ws.current = socket;
    return () => socket.close();
  }, [auth, showToast]);

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

  const sendAction = (payload: { type: string; [key: string]: unknown }) => {
    if (payload.type === 'vote') {
      Analytics.trackEvent('vote_cast', { vote: payload.vote });
      showToast(`Vote cast: ${payload.vote as string}`, 'success');
    }
    if (payload.type === 'add_evidence') {
      Analytics.trackEvent('evidence_added');
      showToast('Evidence submitted to database.', 'info');
    }
    ws.current?.send(JSON.stringify(payload));
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('karma_court_onboarded', 'true');
    setShowOnboarding(false);
    Analytics.trackEvent('game_start');
    QualityAssurance.runSanityChecks(gameState);
  };

  if (!discordSdk || error) {
    return (
      <div className="app-container">
        <h1 className="error-title">🚧 Development Mode 🚧</h1>
        <p className="error-message">{error || "App running outside Discord."}</p>
      </div>
    );
  }

  if (isMobile) {
    return <MobileNotice />;
  }

  if (!auth) return <LoadingScreen />;

  return (
    <>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      <Courtroom 
        currentUser={auth.user}
        discordSdk={discordSdk!}
        gameState={gameState}
        isShaking={isShaking}
        showObjection={showObjection}
        speakingUsers={speakingUsers}
        isMuted={isMuted}
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
        isMuted={isMuted}
        isJudge={gameState.judge_id === auth.user.id}
        onToggleMute={() => setIsMuted(!isMuted)}
        onAddEvidence={(text) => sendAction({ type: 'add_evidence', text, username: auth.user.username })}
        onDeleteEvidence={(id) => sendAction({ type: 'delete_evidence', id })}
        onObjection={() => sendAction({ type: 'objection', username: auth.user.username })}
      />
    </>
  );
}

export default App;