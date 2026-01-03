import { motion } from 'framer-motion';
import '../courtroom.css';

interface AudienceGalleryProps {
  participants: any[];
  speakingUsers: Set<string>;
  judgeId: string | null;
}

export default function AudienceGallery({ participants, speakingUsers, judgeId }: AudienceGalleryProps) {
  // Sort: Judge first, then others
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === judgeId) return -1;
    if (b.id === judgeId) return 1;
    return 0;
  });

  return (
    <div className="audience-gallery-container">
      <div className="gallery-header">
         <span className="gallery-label">GALLERY / JURY [{participants.length}]</span>
         <div className="gallery-line"></div>
      </div>
      
      <div className="gallery-grid">
        {sortedParticipants.map((p, index) => {
          const isSpeaking = speakingUsers.has(p.id);
          const isJudge = p.id === judgeId;
          const avatarUrl = p.avatar 
            ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` 
            : "https://cdn.discordapp.com/embed/avatars/0.png";
            
          return (
            <motion.div 
              key={p.id} 
              className={`gallery-seat ${isSpeaking ? 'seat-speaking' : ''} ${isJudge ? 'seat-judge' : ''}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' }}
              // @ts-ignore
              style={{ "--i": index }}
            >
              <div className="gallery-avatar-wrapper">
                 <img src={avatarUrl} alt={p.username} className="gallery-avatar" />
                 {isSpeaking && <div className="voice-visualizer"></div>}
                 {isJudge && <div className="judge-crown">👑</div>}
              </div>
              <span className={`gallery-name ${isJudge ? 'text-judge' : ''}`}>
                {p.global_name || p.username}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}