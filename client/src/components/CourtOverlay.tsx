import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Courtroom.css';

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
  username: string;
  onAddEvidence: (text: string) => void;
  onObjection: () => void;
}

export default function CourtOverlay({ logs, evidence, username, onAddEvidence, onObjection }: CourtOverlayProps) {
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
        <h4 className="text-xs font-bold text-gray-400 mb-2 sticky top-0 bg-slate-900/90 w-full p-1 border-b border-white/10">COURT RECORD</h4>
        {logs.map((log, i) => (
          <div key={i} className={`log-entry log-type-${log.type}`}>
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* EVIDENCE BOARD - Top Right */}
      <div className="evidence-board">
        <div className="evidence-header">
            <h4 className="text-[0.65rem] font-bold text-gray-400">EVIDENCE</h4>
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
        <button onClick={onObjection} className="btn-objection group">
           <div className="objection-bubble group-hover:scale-110 transition-transform">OBJECTION!</div>
        </button>
      </div>
    </>
  );
}