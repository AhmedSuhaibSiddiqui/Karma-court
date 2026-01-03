import { motion } from 'framer-motion';
import type { ChangeEvent } from 'react';
import '../courtroom.css';

interface CourtHeaderProps {
  crime: string;
  isJudge: boolean;
  onCrimeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onGenerateCrime: () => void;
}

export default function CourtHeader({ crime, isJudge, onCrimeChange, onGenerateCrime }: CourtHeaderProps) {
  return (
    <div className="court-header">
      <div className="cyber-lines-top"></div>
      
      {/* Top Bar */}
      <div className="flex justify-between w-full max-w-[600px] items-center relative z-20">
         <div className="warning-wrapper">
            <span className="glitch-text" data-text="⚠ COURT IN SESSION ⚠">⚠ COURT IN SESSION ⚠</span>
         </div>
      </div>
      
      <motion.div 
        className="crime-card"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, ease: "circOut" }}
      >
        <div className="crime-scanner-line"></div>
        <div className="flex justify-between items-center mb-1">
             <p className="crime-label">/// CURRENT ACCUSATION ///</p>
             {isJudge && (
               <button onClick={onGenerateCrime} className="btn-ai-gen" title="Auto-Generate Accusation">
                 🤖 AI_GEN
               </button>
             )}
        </div>
        <input 
          className="crime-input"
          value={crime}
          onChange={onCrimeChange}
          placeholder={isJudge ? "ENTER ACCUSATION..." : "AWAITING JUDGE..."}
          disabled={!isJudge} 
          maxLength={60}
        />
        <div className="corner-decor top-left"></div>
        <div className="corner-decor top-right"></div>
        <div className="corner-decor bottom-left"></div>
        <div className="corner-decor bottom-right"></div>
      </motion.div>
    </div>
  );
}