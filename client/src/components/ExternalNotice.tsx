import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import './MobileNotice.css'; // Core layout styles
import './ExternalNotice.css'; // New advanced styles

export default function ExternalNotice({ error }: { error?: string | null }) {
  const [typedText, setTypedText] = useState("");
  const fullText = error || "SECURE_CONNECTION_REQUIRED";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i + 1));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div className="external-notice-container">
      {/* Dynamic Backgrounds */}
      <div className="cyber-hex-bg"></div>
      <div className="scanline-overlay"></div>
      
      {/* 3D Security Core */}
      <div className="security-core-wrapper">
        <div className="cube">
          <div className="face front"></div>
          <div className="face back"></div>
          <div className="face right"></div>
          <div className="face left"></div>
          <div className="face top"></div>
          <div className="face bottom"></div>
        </div>
      </div>

      <motion.div 
        className="cyber-panel"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="panel-header">
          <div className="status-light blink-red"></div>
          <span className="panel-title">ACCESS_DENIED</span>
          <div className="panel-decor">///</div>
        </div>

        <div className="content-grid">
          <div className="icon-column">
            <span className="lock-icon">🔒</span>
          </div>
          
          <div className="info-column">
            <h1 className="main-warning">PROTOCOL MISMATCH</h1>
            <p className="sub-warning">
              OUTSIDE ENVIRONMENT DETECTED.<br/>
              INITIATING LOCKDOWN.
            </p>
            
            <div className="terminal-box">
              <span className="prompt">&gt; ANALYZING_SOURCE...</span><br/>
              <span className="prompt">&gt; TARGET:</span> <span className="highlight-blue">BROWSER_AGENT</span><br/>
              <span className="prompt">&gt; STATUS:</span> <span className="highlight-red">{typedText}<span className="cursor">_</span></span>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <div className="resolution-text">
            PLEASE LAUNCH VIA <span className="neon-text">DISCORD_ACTIVITY_LAYER</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}