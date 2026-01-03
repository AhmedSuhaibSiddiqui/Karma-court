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
  isMuted: boolean;
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
  isMuted,
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
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  
  // Audio Interaction Gate
  const [hasInteracted, setHasInteracted] = useState(false);

  // Local State for Input (Anti-Lag)
  const [localCrime, setLocalCrime] = useState(gameState.crime);
  const crimeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync Local State
  useEffect(() => {
    setLocalCrime(gameState.crime);
  }, [gameState.crime]);
  
  // Sync Mute State to Music
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (bgmRef.current) {
      bgmRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Sync Participants List periodically or once
  useEffect(() => {
    const fetchParticipants = async () => {
        try {
            const channel = await discordSdk.commands.getInstanceConnectedParticipants();
            let users = channel.participants || [];
            
            // Ensure current user is in the list
            if (!users.find((p: any) => p.id === currentUser.id)) {
                users = [...users, currentUser];
            }
            setParticipants(users);
        } catch (e) {
            console.warn("Failed to fetch participants", e);
            setParticipants([currentUser]);
        }
    };
    fetchParticipants();
    // Poll every 5s to keep gallery updated? Or just on load/interaction.
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [discordSdk, currentUser]);

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
      // STOP if already playing this track to prevent audio glitches/restarts
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
      newAudio.muted = isMutedRef.current;
      
      newAudio.play().catch(() => {
        // Autoplay waiting for interaction...
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
  const isExecutionDisabled = isUnknown || !gameState.crime || gameState.crime.trim() === "";

  const handleExecuteAttempt = () => {
      if (isExecutionDisabled) {
          setErrorPopup("ERROR: PROTOCOL HALTED. DEFENDANT OR ACCUSATION MISSING.");
          setTimeout(() => setErrorPopup(null), 3000);
      } else {
          onCallVerdict();
      }
  };

  // Dynamic Background Logic
  const isTrialActive = !isUnknown && !gameState.verdict;
  const isUrgent = isTrialActive && gameState.timer <= 10;
  
  let bgClass = "";
  if (isTrialActive) {
      bgClass = "trial-active";
      if (gameState.votes.guilty > gameState.votes.innocent) bgClass += " lead-guilty";
      if (gameState.votes.innocent > gameState.votes.guilty) bgClass += " lead-innocent";
      if (isUrgent) bgClass += " tension-pulse";
  }

  return (
    <div className={`courtroom-container ${bgClass} ${isShaking ? 'shake-screen' : ''}`}>
      
      {/* BACKGROUND LAYERS */}
      <div className="cyber-grid-bg"></div>
      <div className="tension-overlay"></div>

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
        {errorPopup && (
          <motion.div 
            className="error-popup"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
          >
            ⚠ {errorPopup}
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
               <div className="objection-author-box">
                  <span className="objection-author-label">CALLED BY</span>
                  <span className="objection-author-name">{showObjection}</span>
               </div>
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
                {participants
                  .filter(p => (selectionMode === 'accused' && participants.length > 1) ? p.id !== currentUser.id : true)
                  .map(p => (
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
                  {isJudge && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNextCase(); }} 
                      className="btn-next-case mt-6"
                    >
                      CLOSE CASE &gt;&gt;
                    </button>
                  )}
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
            onCallVerdict={handleExecuteAttempt}
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