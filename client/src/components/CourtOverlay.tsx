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
  onToggleMute: () => void;
  onAddEvidence: (text: string) => void;
  onObjection: () => void;
}

export default function CourtOverlay({ logs, evidence, isMuted, onToggleMute, onAddEvidence, onObjection }: CourtOverlayProps) {
  const [showEvidenceInput, setShowEvidenceInput] = useState(false);
  const [evidenceText, setEvidenceText] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const submitEvidence = () => {
    if (!evidenceText.trim()) return;
    onAddEvidence(evidenceText);
    setEvidenceText("");
    setShowEvidenceInput(false);
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
        <button onClick={onToggleMute} className="btn-mute-alt">
           {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* EVIDENCE BOARD - Top Right */}
      <div className="evidence-board">
        <div className="evidence-header">
            <h4 className="evidence-title">EVIDENCE</h4>
            <button 
              onClick={() => setShowEvidenceInput(!showEvidenceInput)}
              className="btn-add-evidence"
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
            />
            <button onClick={submitEvidence} className="btn-submit-evidence">SUBMIT</button>
          </div>
        )}

        {evidence.map((ev) => (
          <motion.div 
            key={ev.id} 
            className="evidence-card"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="evidence-text">{ev.text}</div>
            <div className="evidence-author">- {ev.author}</div>
          </motion.div>
        ))}
      </div>

      {/* OBJECTION BUTTON (Floating) */}
      <div className="objection-btn-wrapper">
        <div className="text-[0.6rem] font-bold text-red-500 mb-1 tracking-[3px] text-right font-mono animate-pulse">
          EMERGENCY OVERRIDE
        </div>
        <button onClick={onObjection} className="btn-objection group">
           <div className="objection-bubble">OBJECTION!</div>
        </button>
      </div>
    </>
  );
}