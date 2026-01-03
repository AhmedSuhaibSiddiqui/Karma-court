import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './courtroom.css';

interface Evidence {
  id: number;
  text: string;
  author: string;
}

interface LogEntry {
  message: string;
  type: string;
}

interface CourtOverlayProps {
  logs: LogEntry[];
  evidence: Evidence[];
  isMuted: boolean;
  isJudge: boolean;
  onToggleMute: () => void;
  onAddEvidence: (text: string) => void;
  onDeleteEvidence: (id: number) => void;
  onObjection: () => void;
}

export default function CourtOverlay({ logs, evidence, isMuted, isJudge, onToggleMute, onAddEvidence, onDeleteEvidence, onObjection }: CourtOverlayProps) {
  const [showEvidenceInput, setShowEvidenceInput] = useState(false);
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceCooldown, setEvidenceCooldown] = useState(0);
  const [objectionCooldown, setObjectionCooldown] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Constants for cooldowns (match server)
  const EVIDENCE_COOLDOWN_TIME = 3;
  const OBJECTION_COOLDOWN_TIME = 10;

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Cooldown Timer Tick (using 100ms for smoother visual fill)
  useEffect(() => {
    const timer = setInterval(() => {
      setEvidenceCooldown((prev) => Math.max(0, prev - 0.1));
      setObjectionCooldown((prev) => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const submitEvidence = () => {
    if (!evidenceText.trim() || evidenceCooldown > 0) return;
    onAddEvidence(evidenceText);
    setEvidenceText("");
    setShowEvidenceInput(false);
    setEvidenceCooldown(EVIDENCE_COOLDOWN_TIME);
  };

  const handleObjection = () => {
    if (objectionCooldown > 0) return;
    onObjection();
    setObjectionCooldown(OBJECTION_COOLDOWN_TIME);
  };

  return (
    <>
      {/* COURT RECORD (LOGS) - Top Left */}
      <div className="logs-area">
        <h4 className="logs-header">COURT RECORD</h4>
        {logs.map((log, i) => (
          <div key={i} className={`log-entry log-type-${log.type}`}>
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* MUTE BUTTON - Below Logs */}
      <div className="mute-control-wrapper">
        <button 
          onClick={onToggleMute} 
          className="btn-mute-alt"
          aria-label={isMuted ? "Unmute Background Music" : "Mute Background Music"}
        >
           {isMuted ? "🔇 Music OFF" : "🔊 Music ON"}
        </button>
      </div>

      {/* EVIDENCE BOARD - Top Right */}
      <div className="evidence-board">
        <div className="evidence-header">
            <h4 className="evidence-title">EVIDENCE</h4>
            <button 
              onClick={() => setShowEvidenceInput(!showEvidenceInput)}
              className="btn-add-evidence"
              aria-label="Add New Evidence"
            >
              + ADD
            </button>
        </div>

        {showEvidenceInput && (
          <div className="evidence-input-area">
            <input 
              className="evidence-input"
              placeholder="Enter evidence..."
              value={evidenceText}
              maxLength={100}
              onChange={e => setEvidenceText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitEvidence()}
              aria-label="Evidence Text Input"
            />
            <button 
              onClick={submitEvidence} 
              className="btn-submit-evidence"
              aria-label="Submit Evidence"
            >
              SUBMIT
            </button>
          </div>
        )}

        <div className="evidence-list-container">
          {evidence.map((ev) => (
            <motion.div 
              key={ev.id} 
              className="evidence-card"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <div className="flex justify-between items-start">
                 <div className="evidence-text">{ev.text}</div>
                 {isJudge && (
                   <button 
                     onClick={() => onDeleteEvidence(ev.id)}
                     className="btn-delete-evidence"
                     title="Remove Evidence"
                     aria-label="Delete Evidence"
                   >
                     ✕
                   </button>
                 )}
              </div>
              <div className="evidence-author">- {ev.author}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* OBJECTION BUTTON (Floating) */}
      <div className="objection-btn-wrapper">
        <div className="text-[0.6rem] font-bold text-red-500 mb-1 tracking-[3px] text-right font-mono animate-pulse">
          {objectionCooldown > 0 ? `RECHARGING SYSTEM [${Math.ceil(objectionCooldown)}s]` : "EMERGENCY OVERRIDE"}
        </div>
        <button 
          onClick={handleObjection} 
          className={`btn-objection group ${objectionCooldown > 0 ? 'cursor-not-allowed' : ''}`}
          disabled={objectionCooldown > 0}
          aria-label="Call Objection!"
        >
           <div className="objection-bubble relative overflow-hidden">
              <span className="relative z-10">{objectionCooldown > 0 ? "..." : "OBJECTION!"}</span>
              {objectionCooldown > 0 && (
                <motion.div 
                  className="absolute bottom-0 left-0 w-full bg-red-500/30 z-0"
                  initial={{ height: "0%" }}
                  animate={{ height: `${(objectionCooldown / OBJECTION_COOLDOWN_TIME) * 100}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              )}
           </div>
        </button>
      </div>
    </>
  );
}