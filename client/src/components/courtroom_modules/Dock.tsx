import { motion } from 'framer-motion';
import '../courtroom.css';

interface DockProps {
  accused: { username: string; avatar: string | null };
  witness: { username: string | null; avatar: string | null };
  verdict: 'guilty' | 'innocent' | null;
  votes: { guilty: number; innocent: number };
  isJudge: boolean;
  currentUserId: string;
  judgeId: string | null;
  onSelectAccused: () => void;
  onSelectWitness: () => void;
}

export default function Dock({ 
  accused, 
  witness, 
  verdict, 
  votes, 
  isJudge, 
  currentUserId, 
  judgeId,
  onSelectAccused, 
  onSelectWitness 
}: DockProps) {
  
  const getRingColor = () => {
    if (verdict === 'guilty') return 'ring-guilty';
    if (verdict === 'innocent') return 'ring-innocent';
    // Fallback to voting trend if no verdict yet
    if (votes.guilty > votes.innocent) return 'ring-guilty';
    if (votes.innocent > votes.guilty) return 'ring-innocent';
    return 'ring-neutral'; 
  };

  const getNameClass = () => {
    if (verdict === 'guilty') return 'name-guilty';
    if (verdict === 'innocent') return 'name-innocent';
    // Fallback to voting trend
    if (votes.guilty > votes.innocent) return 'name-guilty';
    if (votes.innocent > votes.guilty) return 'name-innocent';
    return '';
  };

  return (
    <div className="dock-area">
      
      {/* WITNESS STAND (Floating Left) */}
      <div className="witness-container">
          <div 
            className={`witness-box ${isJudge ? 'interactive' : ''} ${witness?.username ? 'active-witness' : ''}`}
            onClick={onSelectWitness}
          >
             {witness?.avatar ? (
               <img src={witness.avatar} className="witness-avatar" alt="Witness" />
             ) : (
               <div className="witness-placeholder">?</div>
             )}
             <div className="witness-ring"></div>
          </div>
          <p className="witness-label">{witness?.username || "NO WITNESS"}</p>
      </div>

      {/* ACCUSED MAIN DOCK */}
      <div className="accused-container">
        <div 
          className={`avatar-wrapper ${isJudge ? 'interactive' : ''}`}
          onClick={onSelectAccused}
        >
          {/* Verdict FX */}
          {verdict === 'guilty' && <div className="cyber-jail-bars"></div>}
          {verdict === 'innocent' && <div className="cyber-halo"></div>}

          {/* Holographic Rings */}
          <div className={`holo-ring-outer ${getRingColor()}`}></div>
          <div className="holo-ring-inner"></div>
          <div className="holo-scanner"></div>
          
          <motion.img 
            src={accused.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} 
            alt="Accused" 
            className="avatar-image-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </div>
        
        <div className="accused-info">
          <h1 className={`accused-name glitch-text ${getNameClass()}`} data-text={accused.username}>
            {accused.username}
          </h1>
          <div className="status-badge">
            {isJudge ? (
              <span className="judge-auth-text" data-text=">>> AUTH: JUDGE <<<"></span>
            ) : (
              <span>JUDGE: {judgeId === currentUserId ? "YOU" : "PRESENT"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}