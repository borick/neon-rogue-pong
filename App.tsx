import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatePhase, PlayerStats, Upgrade, GameContext } from './types';
import { INITIAL_PLAYER_STATS, ENEMIES, UPGRADES, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { Button } from './components/Button';
import GameCanvas from './components/GameCanvas';

// Helper to shuffle upgrades
const getRandomUpgrades = (count: number): Upgrade[] => {
  const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GameStatePhase>('MENU');
  const [level, setLevel] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_PLAYER_STATS);
  const [currentEnemyHp, setCurrentEnemyHp] = useState(3);
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  
  // We use a ref for game active state to prevent re-renders in the loop if not needed
  // but for React state management flow:
  
  const startGame = () => {
    setPlayerStats(INITIAL_PLAYER_STATS);
    setLevel(1);
    setCurrentEnemyHp(ENEMIES[0].hp);
    setPhase('PLAYING');
  };

  const handleLevelComplete = () => {
    if (level >= ENEMIES.length) {
      setPhase('VICTORY');
    } else {
      setAvailableUpgrades(getRandomUpgrades(3));
      setPhase('LEVEL_UP');
    }
  };

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    setPlayerStats(prev => upgrade.apply(prev));
    setLevel(l => l + 1);
    // Reset enemy HP for next level
    if (level < ENEMIES.length) {
      setCurrentEnemyHp(ENEMIES[level].hp); // Note: level is 1-based, array 0-based, so level index matches next enemy
      setPhase('PLAYING');
    } else {
       setPhase('VICTORY'); // Should be caught by handleLevelComplete but just in case
    }
  };

  const handleGameOver = () => {
    setPhase('GAME_OVER');
  };

  const handlePlayerDamage = () => {
    setPlayerStats(prev => {
        const newHp = prev.hp - 1;
        if (newHp <= 0) {
            // Defer game over to effect or next render cycle to avoid update during render issues
            setTimeout(() => setPhase('GAME_OVER'), 0);
        }
        return { ...prev, hp: newHp };
    });
  };

  const handleEnemyDamage = () => {
    setCurrentEnemyHp(prev => {
        const newHp = prev - 1;
        if (newHp <= 0) {
             setTimeout(() => handleLevelComplete(), 0);
        }
        return newHp;
    });
  };

  // Current Enemy Data
  const currentEnemyIndex = Math.min(level - 1, ENEMIES.length - 1);
  const currentEnemy = ENEMIES[currentEnemyIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative">
       {/* CRT Overlay */}
      <div className="scanlines pointer-events-none" />
      
      {/* Main Game Container */}
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-zinc-900 shadow-2xl overflow-hidden border border-zinc-800">
        
        {/* State: MENU */}
        {phase === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 retro-font text-center glow-text tracking-tighter p-4">
              NEON<br/>ROGUE
            </h1>
            <p className="text-cyan-400/60 font-mono tracking-widest text-sm">V.1.0.0 // SYSTEM_READY</p>
            <Button onClick={startGame} size="lg" className="animate-pulse">Initialize Run</Button>
          </div>
        )}

        {/* State: PLAYING */}
        {phase === 'PLAYING' && (
          <GameCanvas 
            context={{ level, player: playerStats, enemy: currentEnemy }}
            currentEnemyHp={currentEnemyHp}
            onPlayerScore={handleEnemyDamage}
            onEnemyScore={handlePlayerDamage}
          />
        )}

        {/* State: LEVEL UP */}
        {phase === 'LEVEL_UP' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30 p-8">
            <h2 className="text-4xl font-bold text-emerald-400 mb-2 retro-font">SECTOR CLEARED</h2>
            <p className="text-zinc-400 mb-8 font-mono">Select Augmentation Protocol</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {availableUpgrades.map((upgrade) => (
                <button
                  key={upgrade.id}
                  onClick={() => handleSelectUpgrade(upgrade)}
                  className={`
                    group relative p-6 border-2 flex flex-col items-start text-left h-64 justify-between transition-all duration-300 hover:-translate-y-2
                    ${upgrade.rarity === 'legendary' ? 'border-amber-500 bg-amber-900/10 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 
                      upgrade.rarity === 'rare' ? 'border-purple-500 bg-purple-900/10 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 
                      'border-cyan-500 bg-cyan-900/10 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]'}
                  `}
                >
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 mb-2 inline-block rounded
                      ${upgrade.rarity === 'legendary' ? 'bg-amber-500 text-black' : 
                        upgrade.rarity === 'rare' ? 'bg-purple-500 text-white' : 
                        'bg-cyan-500 text-black'}
                    `}>
                      {upgrade.rarity}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-2 retro-font">{upgrade.name}</h3>
                    <p className="text-zinc-300 mt-2 text-sm leading-relaxed">{upgrade.description}</p>
                  </div>
                  <div className="w-full text-right text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    [ CLICK TO INSTALL ]
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* State: GAME OVER */}
        {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 z-40 space-y-6">
            <h2 className="text-6xl text-red-500 font-bold retro-font glow-text">CRITICAL FAILURE</h2>
            <div className="text-center font-mono text-red-200">
                <p>SECTOR REACHED: {level}</p>
                <p>FINAL SCORE: {playerStats.score}</p>
            </div>
            <Button variant="danger" onClick={() => setPhase('MENU')}>REBOOT SYSTEM</Button>
          </div>
        )}

        {/* State: VICTORY */}
        {phase === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/90 z-40 space-y-6">
            <h2 className="text-6xl text-yellow-400 font-bold retro-font glow-text">SYSTEM SECURED</h2>
            <p className="text-cyan-200 font-mono text-xl max-w-lg text-center">
                You have defeated the Omega Core. The network is safe... for now.
            </p>
            <Button variant="secondary" onClick={() => setPhase('MENU')}>RETURN TO ROOT</Button>
          </div>
        )}
      </div>
      
      {/* Mobile Controls Hint */}
      <div className="fixed bottom-4 left-0 right-0 text-center text-zinc-500 text-xs md:hidden pointer-events-none">
        TAP LEFT/RIGHT TO MOVE IF MOUSE UNAVAILABLE (Implementation Pending)
      </div>
    </div>
  );
};

export default App;
