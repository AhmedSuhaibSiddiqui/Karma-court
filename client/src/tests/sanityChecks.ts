import type { GameState } from '../types/game';

export class QualityAssurance {
  static runSanityChecks(gameState: GameState) {
    console.group('🔍 KARMA COURT SANITY CHECK');
    
    const checks = [
      { name: 'State Exists', pass: !!gameState },
      { name: 'Votes Initialized', pass: typeof gameState?.votes?.guilty === 'number' },
      { name: 'Judge Assigned', pass: !!gameState?.judge_id },
      { name: 'Accused Structure', pass: !!gameState?.accused?.username },
    ];

    checks.forEach(check => {
      console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    console.groupEnd();
    return checks.every(c => c.pass);
  }
}