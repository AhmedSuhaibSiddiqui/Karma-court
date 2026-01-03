import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import './LandingScreen.css';

interface LandingScreenProps {
  onJoin: () => void;
}

export default function LandingScreen({ onJoin }: LandingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLoaded(true), 1500); // Wait 1.5s to show success message
          return 100;
        }
        return prev + Math.random() * 5; // Random chunks
      });
    }, 50);
    return () => clearInterval(timer);
  }, []);

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

        <div className="entry-zone">
          <AnimatePresence mode="wait">
            {!isLoaded ? (
              <motion.div 
                key="loader"
                className="loader-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5 }}
              >
                <div className="cyber-progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min(progress, 100)}%`, background: progress === 100 ? '#00ff66' : 'var(--neon-blue)' }}
                  ></div>
                </div>
                <p className="loading-text" style={{ color: progress === 100 ? '#00ff66' : 'var(--neon-blue)' }}>
                  {progress < 100 ? `SYSTEM INITIALIZING... ${Math.floor(progress)}%` : "SECURE CONNECTION ESTABLISHED"}
                </p>
              </motion.div>
            ) : (
              <motion.button 
                key="btn"
                className="btn-enter"
                onClick={onJoin}
                whileHover={{ scale: 1.05, letterSpacing: "3px" }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                INITIALIZE SESSION
              </motion.button>
            )}
          </AnimatePresence>
        </div>

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