import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import './Courtroom.css';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface GameState {
  votes: { guilty: number; innocent: number };
  crime: string;
  verdict: 'guilty' | 'innocent' | null;
  judge_id: string | null;
  accused: { username: string; avatar: string | null };
}

interface CourtroomProps {
  currentUser: DiscordUser;
  discordSdk: DiscordSDK;
  gameState: GameState;
  isShaking: boolean;
  showObjection: string | null;
  onVote: (type: 'guilty' | 'innocent') => void;
  onUpdateCrime: (crime: string) => void;
  onCallVerdict: () => void;
  onNextCase: () => void;
  onAccuseUser: (user: any) => void;
}

export default function Courtroom({ 
  currentUser, 
  discordSdk, 
  gameState, 
  isShaking, 
  showObjection,
  onVote,
  onUpdateCrime,
  onCallVerdict,
  onNextCase,
  onAccuseUser
}: CourtroomProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Local State for Input (Anti-Lag)
  const [localCrime, setLocalCrime] = useState(gameState.crime);
  const crimeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync Local State with Server State (Only if we aren't the ones typing or on initial load)
  // Simple approach: Always sync, but the local change handler overrides it temporarily
  useEffect(() => {
    // Only update if the server value is significantly different to avoid cursor jumps
    // or simply update it if we haven't typed recently.
    // For simplicity, we just update it. The typing experience is handled by the local state priority.
    setLocalCrime(gameState.crime);
  }, [gameState.crime]);

  const handleCrimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalCrime(newVal);

    if (crimeDebounce.current) clearTimeout(crimeDebounce.current);
    
    crimeDebounce.current = setTimeout(() => {
      onUpdateCrime(newVal);
    }, 500); // Send update after 500ms of silence
  };

  // --- JUDGE: PICK DEFENDANT ---
  const isJudge = gameState.judge_id === currentUser.id;

  const openSelectionModal = async () => {
    if (!isJudge) return;
    const channel = await discordSdk.commands.getInstanceConnectedParticipants();
    setParticipants(channel.participants);
    setIsSelecting(true);
  };

  const pickAccused = (user: any) => {
    onAccuseUser({ 
      username: user.username || user.global_name, 
      avatar: user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
        : "https://cdn.discordapp.com/embed/avatars/0.png"
    });
    setIsSelecting(false);
  };

  // --- DYNAMIC STYLING ---
  const { guilty, innocent } = gameState.votes;
  
  const getRingColor = () => {
    if (guilty > innocent) return 'ring-guilty';
    if (innocent > guilty) return 'ring-innocent';
    return 'ring-neutral'; // Tie / Default
  };

  const getNameStyle = () => {
    if (guilty > innocent) return { 
        backgroundImage: "linear-gradient(to bottom, #f87171, #dc2626)", 
        textShadow: "0 0 30px rgba(220, 38, 38, 0.8)" 
    };
    if (innocent > guilty) return { 
        backgroundImage: "linear-gradient(to bottom, #60a5fa, #2563eb)", 
        textShadow: "0 0 30px rgba(37, 99, 235, 0.8)" 
    };
    // Tie: Fire & Ice Gradient
    return { 
        backgroundImage: "linear-gradient(to right, #ef4444, #3b82f6)", 
        textShadow: "0 0 20px rgba(255, 255, 255, 0.3)" 
    };
  };

  return (
    <div className={`courtroom-container ${isShaking ? 'shake-screen' : ''}`}>
      
      {/* OBJECTION SPLASH OVERLAY */}
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

      {/* MODAL: SELECT DEFENDANT */}
      <AnimatePresence>
        {isSelecting && (
          <motion.div className="verdict-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="modal-box">
              <h3 className="modal-title">SELECT THE ACCUSED</h3>
              <div className="user-grid">
                {participants.map(p => (
                  <button key={p.id} onClick={() => pickAccused(p)} className="user-card">
                    <img 
                      src={p.avatar ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png"} 
                      className="user-avatar-small" 
                    />
                    <span className="user-name-small">{p.username || p.global_name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsSelecting(false)} className="cancel-btn">CANCEL</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: VERDICT STAMP */}
      <AnimatePresence>
        {gameState.verdict && (
          <motion.div 
            className="verdict-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => isJudge && onNextCase()} 
          >
            <div className="flex flex-col items-center">
              <motion.div 
                className={`stamp ${gameState.verdict === 'guilty' ? 'stamp-guilty' : 'stamp-innocent'}`}
                initial={{ scale: 5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: -15 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {gameState.verdict}
              </motion.div>
              {isJudge && <p className="mt-8 text-white/50 text-sm animate-pulse cursor-pointer bg-black/50 px-4 py-2 rounded">Click anywhere for next case</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="court-header">
        <div className="warning-wrapper"><h2 className="warning-text">⚠ COURT IN SESSION ⚠</h2></div>
        <motion.div className="crime-card">
          <p className="crime-label">SUBJECT ACCUSED OF:</p>
          <input 
            className="crime-input"
            value={localCrime}
            onChange={handleCrimeChange}
            placeholder={isJudge ? "Type the accusation..." : "Judge is typing..."}
            disabled={!isJudge} 
          />
        </motion.div>
      </div>

      {/* DOCK */}
      <div className="dock-area">
        <div 
          className={`avatar-container ${isJudge ? 'cursor-pointer hover:scale-105 transition' : ''}`}
          onClick={openSelectionModal}
          title={isJudge ? "Click to change accused" : ""}
        >
          {/* Dynamic Ring Color */}
          <div className={`scan-ring-1 ${getRingColor()}`}></div>
          <div className="scan-ring-2"></div>
          
          <motion.img 
            src={gameState.accused.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} 
            alt="Accused" 
            initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="avatar-image"
          />
        </div>
        
        <motion.h1 
          className="accused-name"
          animate={getNameStyle()}
          transition={{ duration: 0.5 }}
          style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          {gameState.accused.username}
        </motion.h1>

        <div className="status-badge">
            {isJudge ? "YOU ARE THE JUDGE" : `JUDGE: ${gameState.judge_id === currentUser.id ? "YOU" : "PRESENT"}`}
        </div>
        {isJudge && <p style={{fontSize: '0.6rem', color: '#94a3b8', marginTop: '5px', letterSpacing: '1px', textTransform: 'uppercase'}}>Click avatar to change defendant</p>}
      </div>

      {/* FOOTER */}
      <div className="footer-area">
        <div className="scoreboard">
          <div className="score-box red-team">
             <div className="score-number">{gameState.votes.guilty}</div>
             <div className="score-label">Guilty</div>
          </div>
          
          {isJudge ? (
            <button onClick={onCallVerdict} className="vs-badge hover:bg-slate-700 transition">
               ⚖️ CALL VERDICT
            </button>
          ) : (
            <div className="vs-badge opacity-50">VS</div>
          )}

          <div className="score-box blue-team">
             <div className="score-number">{gameState.votes.innocent}</div>
             <div className="score-label">Innocent</div>
          </div>
        </div>

        <div className="button-row">
          <VoteButton className="vote-btn btn-guilty" label="GUILTY 💀" onClick={() => onVote('guilty')} />
          <VoteButton className="vote-btn btn-innocent" label="INNOCENT 😇" onClick={() => onVote('innocent')} />
        </div>
      </div>
    </div>
  );
}

function VoteButton({ className, label, onClick }: { className: string, label: string, onClick: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.02, filter: 'brightness(1.2)' }} whileTap={{ scale: 0.95 }} onClick={onClick} className={className}>
      {label}
    </motion.button>
  );
}