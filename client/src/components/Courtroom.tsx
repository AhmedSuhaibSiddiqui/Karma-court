import { useState, useEffect, useRef} from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import LandingScreen from './LandingScreen';
import CourtHeader from './courtroom_modules/CourtHeader';
import Dock from './courtroom_modules/Dock';
import VerdictControls from './courtroom_modules/VerdictControls';
import AudienceGallery from './courtroom_modules/AudienceGallery';
import './courtroom.css';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface GameState {
  votes: { guilty: number; innocent: number };
  voters: string[];
  crime: string;
  verdict: 'guilty' | 'innocent' | null;
  sentence: string | null;
  judge_id: string | null;
  accused: { username: string; avatar: string | null };
  witness: { username: string | null; avatar: string | null };
  timer: number;
}

interface CourtroomProps {
  currentUser: DiscordUser;
  discordSdk: DiscordSDK;
  gameState: GameState;
  isShaking: boolean;
  showObjection: string | null;
  speakingUsers: Set<string>;
  onVote: (type: 'guilty' | 'innocent') => void;
  onUpdateCrime: (crime: string) => void;
  onGenerateCrime: () => void;
  onCallVerdict: () => void;
  onPassSentence: () => void;
  onNextCase: () => void;
  onAccuseUser: (user: any) => void;
  onCallWitness: (user: any) => void;
}

export default function Courtroom({
  currentUser,
  discordSdk,
  gameState,
  isShaking,
  showObjection,
  speakingUsers,
  onVote,
  onUpdateCrime,
  onGenerateCrime,
  onCallVerdict,
  onPassSentence,
  onNextCase,
  onAccuseUser,
  onCallWitness
}: CourtroomProps) {
  const [selectionMode, setSelectionMode] = useState<'accused' | 'witness' | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  
  // Audio Interaction Gate
  const [hasInteracted, setHasInteracted] = useState(false);

  // Local State for Input (Anti-Lag)
  const [localCrime, setLocalCrime] = useState(gameState.crime);
  const crimeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync Local State
  useEffect(() => {
    setLocalCrime(gameState.crime);
  }, [gameState.crime]);

  // Sync Participants List periodically or once
  useEffect(() => {
    const fetchParticipants = async () => {
        try {
            const channel = await discordSdk.commands.getInstanceConnectedParticipants();
            setParticipants(channel.participants);
        } catch (e) {
            console.warn("Failed to fetch participants", e);
        }
    };
    fetchParticipants();
    // Poll every 5s to keep gallery updated? Or just on load/interaction.
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [discordSdk]);

  const handleCrimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalCrime(newVal);

    if (crimeDebounce.current) clearTimeout(crimeDebounce.current);
    crimeDebounce.current = setTimeout(() => {
      onUpdateCrime(newVal);
    }, 500);
  };

  // --- MUSIC MANAGER ---
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<string | null>(null);

  // 1. Resume Audio on Interaction (The "Join" Click)
  useEffect(() => {
    if (hasInteracted && bgmRef.current) {
      bgmRef.current.play().catch(() => {});
    }
  }, [hasInteracted]);

  // 2. Track Switching Logic
  useEffect(() => {
    const playTrack = (trackName: string) => {
      if (currentTrackRef.current === trackName) return;
      
      if (bgmRef.current) {
        const oldAudio = bgmRef.current;
        let vol = 0.3;
        const fade = setInterval(() => {
          if (vol > 0.05) {
            vol -= 0.05;
            oldAudio.volume = vol;
          } else {
            clearInterval(fade);
            oldAudio.pause();
          }
        }, 100);
      }

      const newAudio = new Audio(`/sounds/${trackName}.mp3`);
      newAudio.loop = true;
      newAudio.volume = 0;
      
      newAudio.play().catch(() => {
        console.log("Autoplay waiting for interaction...");
      });
      
      let volIn = 0;
      const fadeIn = setInterval(() => {
        if (volIn < 0.3) {
           volIn += 0.05;
           newAudio.volume = volIn;
        } else {
           clearInterval(fadeIn);
        }
      }, 100);

      bgmRef.current = newAudio;
      currentTrackRef.current = trackName;
    };

    if (gameState.verdict) {
      // Fallback to trial_theme if verdict_tension is missing, or keep trial theme playing
      playTrack('trial_theme'); 
    } else if (gameState.accused.username !== "Unknown") {
      playTrack('trial_theme');
    } else {
      playTrack('lobby_theme');
    }
  }, [gameState.verdict, gameState.crime]);

  // --- JUDGE ACTIONS ---
  const isJudge = gameState.judge_id === currentUser.id;

  const openSelectionModal = async (mode: 'accused' | 'witness') => {
    if (!isJudge) return;
    const channel = await discordSdk.commands.getInstanceConnectedParticipants();
    setParticipants(channel.participants);
    setSelectionMode(mode);
  };

  const handleSelection = (user: any) => {
    const userPayload = { 
      username: user.username || user.global_name, 
      avatar: user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
        : "https://cdn.discordapp.com/embed/avatars/0.png"
    };

    if (selectionMode === 'accused') {
      onAccuseUser(userPayload);
    } else if (selectionMode === 'witness') {
      onCallWitness(userPayload);
    }
    setSelectionMode(null);
  };

  // --- VOTING LOGIC ---
  const [myVote, setMyVote] = useState<'guilty' | 'innocent' | null>(null);

  useEffect(() => {
    if ((gameState.voters || []).length === 0) {
      setMyVote(null);
    }
  }, [gameState.voters]);

  const handleVote = (type: 'guilty' | 'innocent') => {
    onVote(type);
    setMyVote(type);
  };

  const isUnknown = gameState.accused.username === "Unknown";
  const hasVoted = (gameState.voters || []).includes(currentUser.id) || myVote !== null;
  const canVote = !isUnknown && !hasVoted;
  const isExecutionDisabled = isUnknown || gameState.crime === "Waiting for accusation..." || !gameState.crime || gameState.crime.trim() === "";

  return (
    <div className={`courtroom-container ${isShaking ? 'shake-screen' : ''}`}>
      
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
          >
             <LandingScreen onJoin={() => setHasInteracted(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showObjection && (
          <motion.div 
            className="objection-splash"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="flex flex-col items-center">
               <h1 className="objection-text-img">OBJECTION!</h1>
               <h2 className="text-2xl font-bold bg-black/50 px-4 rounded text-white">{showObjection}</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectionMode && (
          <motion.div className="verdict-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="modal-box">
              <h3 className="modal-title">SELECT {selectionMode === 'accused' ? 'THE ACCUSED' : 'A WITNESS'}</h3>
              <div className="user-grid">
                {participants.map(p => (
                  <button key={p.id} onClick={() => handleSelection(p)} className="user-card">
                    <img 
                      src={p.avatar ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png"} 
                      className="user-avatar-small" 
                    />
                    <span className="user-name-small">{p.username || p.global_name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectionMode(null)} className="cancel-btn">CANCEL</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VERDICT & SENTENCE OVERLAY */}
      <AnimatePresence>
        {gameState.verdict && !gameState.sentence && (
          <motion.div 
            className="verdict-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="verdict-content">
              <motion.div 
                className={`stamp ${gameState.verdict === 'guilty' ? 'stamp-guilty' : 'stamp-innocent'}`}
                initial={{ scale: 5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: -15 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {gameState.verdict}
              </motion.div>
              
              <div className="verdict-buttons">
                {isJudge && gameState.verdict === 'guilty' && (
                   <button onClick={onPassSentence} className="btn-sentence">
                      ⚖️ PASS SENTENCE
                   </button>
                )}
                
                {isJudge && (gameState.verdict === 'innocent') && (
                   <button onClick={onNextCase} className="btn-next-case">
                      NEXT CASE &gt;&gt;
                   </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SENTENCE REVEAL OVERLAY */}
      <AnimatePresence>
        {gameState.sentence && (
           <motion.div 
            className="verdict-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => isJudge && onNextCase()}
           >
              <div className="sentence-card">
                  <h2 className="sentence-title">PUNISHMENT DECREED</h2>
                  <p className="sentence-text">{gameState.sentence}</p>
                  {isJudge && <p className="mt-4 text-xs text-slate-400 text-center">Click to Close Case</p>}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <CourtHeader 
        crime={localCrime} 
        isJudge={isJudge} 
        onCrimeChange={handleCrimeChange} 
        onGenerateCrime={onGenerateCrime}
      />

      {/* MAIN STAGE (DOCK + WITNESS) */}
      <Dock 
        accused={gameState.accused}
        witness={gameState.witness}
        verdict={gameState.verdict}
        votes={gameState.votes}
        isJudge={isJudge}
        currentUserId={currentUser.id}
        judgeId={gameState.judge_id}
        onSelectAccused={() => openSelectionModal('accused')}
        onSelectWitness={() => openSelectionModal('witness')}
      />

      {/* FOOTER AREA */}
      <div className="flex flex-col w-full max-w-[800px] gap-2 mb-2" style={{zIndex: 20}}>
         <VerdictControls 
            votes={gameState.votes}
            isJudge={isJudge}
            userVote={myVote}
            canVote={canVote}
            timer={gameState.timer}
            isExecutionDisabled={isExecutionDisabled}
            onVote={handleVote}
            onCallVerdict={onCallVerdict}
         />
         
         <AudienceGallery 
            participants={participants} 
            speakingUsers={speakingUsers} 
            judgeId={gameState.judge_id}
         />
      </div>

    </div>
  );
}