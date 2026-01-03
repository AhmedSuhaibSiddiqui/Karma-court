import { motion } from 'framer-motion';
import './MobileNotice.css';

export default function MobileNotice() {
  return (
    <div className="mobile-notice-container">
      <div className="glitch-overlay"></div>
      <motion.div 
        className="notice-box"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="security-header">
          <span className="blink-dot"></span>
          <span className="header-text">SECURITY_RESTRICTION_PROTOCOL</span>
        </div>
        
        <h1 className="notice-title">RESTRICTED ACCESS</h1>
        
        <div className="divider-line"></div>
        
        <p className="notice-text">
          UNSUPPORTED TERMINAL DETECTED. <br />
          <span className="highlight">KARMA_COURT_V2</span> IS AN EXCLUSIVE DESKTOP STATION INTERFACE.
        </p>
        
        <div className="tech-details">
          <p>ERROR_CODE: ERR_HARDWARE_INCOMPATIBILITY</p>
          <p>RESOLUTION: PLEASE JOIN VIA PC/DESKTOP CLIENT FOR SYSTEM SYNC.</p>
        </div>

        <div className="scan-bar"></div>
      </motion.div>
      
      <p className="footer-code">&gt;&gt;&gt; SYSTEM_WAITING_FOR_DESKTOP_STATION_SYNC...</p>
    </div>
  );
}