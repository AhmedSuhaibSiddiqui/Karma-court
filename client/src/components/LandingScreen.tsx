import { motion } from 'framer-motion';
import './LandingScreen.css';

interface LandingScreenProps {
  onJoin: () => void;
}

export default function LandingScreen({ onJoin }: LandingScreenProps) {
  return (
    <div className="landing-container">
      <div className="landing-grid-bg"></div>
      
      <div className="landing-content">
        <motion.div 
          className="logo-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <h1 className="landing-title" data-text="KARMA COURT">KARMA COURT</h1>
          <div className="scan-line"></div>
        </motion.div>

        <motion.p 
          className="landing-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          JUSTICE IS SERVED COLD
        </motion.p>

        <motion.div
          className="how-to-play"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <ul className="rules-list">
             <li>👑 <strong>JUDGE:</strong> Accuse a friend & manage the trial.</li>
             <li>🗣️ <strong>JURY:</strong> Vote Guilty or Innocent.</li>
             <li>📢 <strong>OBJECTION:</strong> Interrupt the court!</li>
          </ul>
        </motion.div>

        <motion.button 
          className="btn-enter"
          onClick={onJoin}
          whileHover={{ scale: 1.05, letterSpacing: "3px" }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: "spring" }}
        >
          INITIALIZE SESSION
        </motion.button>

        <motion.div 
          className="headphones-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2 }}
        >
          🎧 AUDIO RECOMMENDED
        </motion.div>
      </div>
    </div>
  );
}