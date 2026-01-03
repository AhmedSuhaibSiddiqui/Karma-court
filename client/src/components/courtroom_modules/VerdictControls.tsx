import '../courtroom.css';

interface VerdictControlsProps {
  votes: { guilty: number; innocent: number };
  isJudge: boolean;
  userVote: 'guilty' | 'innocent' | null;
  canVote: boolean;
  timer: number;
  isExecutionDisabled: boolean;
  onVote: (type: 'guilty' | 'innocent') => void;
  onCallVerdict: () => void;
}

export default function VerdictControls({ 
  votes, 
  isJudge, 
  userVote, 
  canVote, 
  timer,
  isExecutionDisabled,
  onVote, 
  onCallVerdict 
}: VerdictControlsProps) {

  // Format timer MM:SS (though strictly it's just 60s max, so just SS is fine)
  // But let's do 00:00 style if needed, or just large seconds
  const isUrgent = timer <= 10;

  return (
    <div className="verdict-controls">
      
      {/* SCOREBOARD */}
      <div className="scoreboard-cyber">
        <div className="score-block score-guilty">
           <span className="score-val">{votes.guilty}</span>
           <span className="score-lbl">GUILTY</span>
        </div>
        
        <div className="center-action">
          {isJudge ? (
            <div className="flex flex-col items-center">
               {timer > 0 && <span className={`timer-text ${isUrgent ? 'timer-urgent' : ''}`}>{timer}s</span>}
               <button 
                onClick={onCallVerdict} 
                className={`btn-call-verdict mt-2 ${isExecutionDisabled ? 'disabled' : ''}`}
                disabled={isExecutionDisabled}
               >
                  <span>⚖ EXECUTE</span>
               </button>
            </div>
          ) : (
            <div className="vs-divider flex flex-col items-center">
              {timer > 0 && <span className={`timer-text ${isUrgent ? 'timer-urgent' : ''}`}>{timer}s</span>}
              <span>VS</span>
            </div>
          )}
        </div>

        <div className="score-block score-innocent">
           <span className="score-val">{votes.innocent}</span>
           <span className="score-lbl">INNOCENT</span>
        </div>
      </div>

      {/* VOTE BUTTONS */}
      <div className="vote-actions">
        <button 
          className={`btn-cyber btn-vote-guilty ${userVote === 'guilty' ? 'active' : ''} ${!canVote && userVote !== 'guilty' ? 'disabled' : ''}`}
          onClick={() => canVote && onVote('guilty')}
          disabled={!canVote}
        >
          <div className="btn-content">
            <span className="icon">☠</span>
            <span className="text">GUILTY</span>
          </div>
          <div className="glitch-overlay"></div>
        </button>

        <button 
          className={`btn-cyber btn-vote-innocent ${userVote === 'innocent' ? 'active' : ''} ${!canVote && userVote !== 'innocent' ? 'disabled' : ''}`}
          onClick={() => canVote && onVote('innocent')}
          disabled={!canVote}
        >
          <div className="btn-content">
            <span className="icon">☺</span>
            <span className="text">INNOCENT</span>
          </div>
          <div className="glitch-overlay"></div>
        </button>
      </div>

    </div>
  );
}