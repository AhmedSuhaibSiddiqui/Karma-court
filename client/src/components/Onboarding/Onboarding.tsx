import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './onboarding.css';

interface OnboardingStep {
  target: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { target: 'header', title: 'THE ACCUSATION', description: 'This is where the Judge enters the crime. Use AI_GEN for inspiration.' },
  { target: 'dock', title: 'THE DEFENDANT', description: 'The accused sits here. Watch for visual effects based on the lead vote.' },
  { target: 'controls', title: 'VOTING PROTOCOL', description: 'Cast your vote here. Remember, your voice matters in the Jury.' },
  { target: 'objection', title: 'EMERGENCY OVERRIDE', description: 'Anyone can call an Objection to pause the court and make a point.' },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="onboarding-overlay">
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep}
          className="onboarding-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className="step-counter">STEP_0{currentStep + 1} / PROTOCOL_04</div>
          <h2 className="step-title">{STEPS[currentStep].title}</h2>
          <p className="step-description">{STEPS[currentStep].description}</p>
          <button className="step-btn" onClick={next}>
            {currentStep === STEPS.length - 1 ? 'INITIALIZE GAME' : 'NEXT_MODULE >>'}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
