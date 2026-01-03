import { motion } from 'framer-motion';
import './LandingScreen.css'; // Reuse grid styles

export default function LoadingScreen() {
  return (
    <div className="landing-container">
      <div className="landing-grid-bg"></div>
      
      <div className="landing-content relative">
        {/* HUD Elements */}
        <div className="absolute top-[-150px] left-[-150px] w-[300px] h-[300px] border border-blue-900/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-150px] right-[-150px] w-[300px] h-[300px] border border-red-900/30 rounded-full animate-pulse delay-75"></div>

        <div className="flex flex-col items-center gap-8 z-10">
          
          {/* Cyber Ring Loader */}
          <div className="relative w-32 h-32">
            {/* Outer Ring */}
            <motion.div 
              className="absolute inset-0 border-2 border-blue-500/20 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, ease: "linear", repeat: Infinity }}
            ></motion.div>
            
            {/* Middle Scanner */}
            <motion.div 
              className="absolute inset-2 border-t-2 border-r-2 border-blue-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: "linear", repeat: Infinity }}
            ></motion.div>
            
            {/* Inner Glitch Ring */}
            <motion.div 
              className="absolute inset-6 border-b-4 border-l-4 border-red-500/80 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 3, ease: "linear", repeat: Infinity }}
            ></motion.div>

            {/* Center Core */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="w-2 h-2 bg-white rounded-full shadow-[0_0_15px_white]"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              ></motion.div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <motion.h2 
              className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-400 tracking-[0.2em]"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: "200% auto" }}
            >
              INITIALIZING
            </motion.h2>

            <motion.div 
              className="flex items-center justify-center gap-1 h-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </motion.div>

            <p className="text-slate-600 font-mono text-[10px] mt-2 tracking-widest">
              SECURE CONNECTION ESTABLISHED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}