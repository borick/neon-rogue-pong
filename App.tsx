import React, { useState, useEffect, useCallback } from 'react';
import { GameStatePhase, PlayerStats, Upgrade, GameContext } from './types';
import { INITIAL_PLAYER_STATS, ENEMIES, UPGRADES, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { Button } from './components/Button';
import GameCanvas from './components/GameCanvas';
import FPSCanvas from './components/FPSCanvas';
import SideScrollerCanvas from './components/SideScrollerCanvas';
import SpaceShooterCanvas from './components/SpaceShooterCanvas';
import MatrixBreachCanvas from './components/MatrixBreachCanvas';
import SurvivorCanvas from './components/SurvivorCanvas';
import { SoundSystem } from './audio';

const App: React.FC = () => {
  const [phase, setPhase] = useState<GameStatePhase>('MENU');
  const [level, setLevel] = useState(1);
  const [prestige, setPrestige] = useState(0);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ ...INITIAL_PLAYER_STATS });
  const [currentEnemyHp, setCurrentEnemyHp] = useState(1);
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  const [shake, setShake] = useState(0);

  const triggerShake = (amount: number = 10) => {
    setShake(amount);
    setTimeout(() => setShake(0), 200);
  };

  const getUpgrades = (count: number): Upgrade[] => {
    const pool = UPGRADES.filter(u => {
      if (u.id === 'architect_key' && playerStats.hasArchitectKey) return false;
      if (u.id === 'chrono_trigger' && playerStats.chronoTrigger) return false;
      return true;
    }).sort(() => Math.random() - 0.5);
    return pool.slice(0, count);
  };

  const startGame = () => {
    SoundSystem.init(); 
    setPlayerStats({ ...INITIAL_PLAYER_STATS, prestige });
    setLevel(1);
    setCurrentEnemyHp(ENEMIES[0].hp);
    setPhase('PLAYING');
  };

  const handleLevelComplete = () => {
    if (level >= ENEMIES.length) {
      setPhase('VICTORY');
    } else {
      setAvailableUpgrades(getUpgrades(3));
      setPhase('LEVEL_UP');
    }
    SoundSystem.playLevelUp();
    triggerShake(15);
  };

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    SoundSystem.playUpgradeSelect();
    setPlayerStats(prev => {
      const next = upgrade.apply(prev);
      return { ...next, shield: next.maxShield };
    });
    const nextLevel = level + 1;
    setLevel(nextLevel);
    if (nextLevel <= ENEMIES.length) {
      setCurrentEnemyHp(ENEMIES[nextLevel - 1].hp); 
      setPhase('PLAYING');
    } else {
      setPhase('VICTORY');
    }
  };

  const handlePlayerDamage = (amt: number = 1) => {
    triggerShake(20);
    setPlayerStats(prev => {
      if (prev.shield > 0) return { ...prev, shield: Math.max(0, prev.shield - amt) };
      const newHp = prev.hp - amt;
      if (newHp <= 0) setTimeout(() => setPhase('GAME_OVER'), 0);
      return { ...prev, hp: newHp };
    });
  };

  const handleEnemyDamage = (amount: number = 1) => {
    if (playerStats.vampirism > 0 && Math.random() < 0.25) {
        setPlayerStats(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 1) }));
    }
    setCurrentEnemyHp(prev => {
      const newHp = prev - amount;
      if (newHp <= 0) setTimeout(() => handleLevelComplete(), 500);
      return newHp;
    });
  };

  const currentEnemyIndex = Math.min(level - 1, ENEMIES.length - 1);
  const baseEnemy = ENEMIES[currentEnemyIndex];
  const scaledEnemy = {
    ...baseEnemy,
    paddleSpeed: baseEnemy.paddleSpeed + (prestige * 2),
    reactionDelay: Math.max(0, baseEnemy.reactionDelay - (prestige * 3)),
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center bg-[#050508] relative overflow-hidden transition-all duration-300`}
      style={{ transform: shake > 0 ? `translate(${(Math.random()-0.5)*shake}px, ${(Math.random()-0.5)*shake}px)` : 'none' }}
    >
      <div className="scanlines pointer-events-none opacity-30 z-50" />
      
      <div className={`relative w-full max-w-4xl aspect-[4/3] bg-black shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden border border-zinc-800 rounded-xl transition-all ${playerStats.hp === 1 ? 'animate-pulse border-red-900 shadow-[0_0_50px_rgba(255,0,0,0.3)]' : ''}`}>
        
        {phase === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 space-y-8 bg-black/90 p-10">
            <h1 className="text-7xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-white retro-font text-center glow-text animate-pulse">
              NEON<br/>ROGUE
            </h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-cyan-500 font-mono tracking-widest text-lg uppercase drop-shadow-[0_0_10px_#06b6d4]">
                PROTOCOL_v{prestige + 1}.{level}
              </p>
              {prestige > 0 && <p className="text-red-500 font-mono text-xs uppercase animate-bounce">PRESTIGE_{prestige}_ACTIVE</p>}
            </div>
            <Button onClick={startGame} size="lg">Initialize Combat</Button>
          </div>
        )}

        {phase === 'PLAYING' && (
          <GameCanvas 
            context={{ level, player: playerStats, enemy: scaledEnemy }}
            currentEnemyHp={currentEnemyHp}
            onPlayerScore={() => { handleEnemyDamage(1); triggerShake(5); }}
            onEnemyScore={() => { handlePlayerDamage(1); SoundSystem.playScoreEnemy(); }}
            onProjectileHit={() => handleEnemyDamage(1)}
            onSecretBreach={() => {
                setPhase('SURVIVOR_MINIGAME');
                triggerShake(30);
            }}
          />
        )}

        {phase === 'SURVIVOR_MINIGAME' && (
          <SurvivorCanvas onComplete={() => {
            setPlayerStats(p => ({ ...p, shield: p.maxShield + 5, hp: p.maxHp }));
            setPhase('PLAYING');
            triggerShake(10);
          }} />
        )}

        {phase === 'LEVEL_UP' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-40 p-12">
            <h2 className="text-5xl font-bold text-emerald-400 mb-2 retro-font drop-shadow-lg">SECTOR_CLEARED</h2>
            <p className="text-zinc-500 mb-10 font-mono tracking-widest uppercase text-xs">Choose Your Augmentation</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
              {availableUpgrades.map((upgrade) => (
                <button 
                  key={upgrade.id} 
                  onClick={() => handleSelectUpgrade(upgrade)} 
                  className={`group p-6 border-2 transition-all flex flex-col justify-between h-72 hover:scale-105 active:scale-95 ${upgrade.rarity === 'legendary' ? 'border-yellow-500 bg-yellow-950/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : upgrade.rarity === 'rare' ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-cyan-500 bg-cyan-950/20'}`}
                >
                  <div className="space-y-4">
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${upgrade.rarity === 'legendary' ? 'text-yellow-400' : upgrade.rarity === 'rare' ? 'text-purple-400' : 'text-cyan-400'}`}>{upgrade.rarity}</span>
                    <h3 className="text-xl font-bold text-white retro-font group-hover:text-white transition-colors">{upgrade.name}</h3>
                    <p className="text-zinc-400 text-xs font-mono leading-relaxed">{upgrade.description}</p>
                  </div>
                  <div className="text-[10px] text-right text-zinc-600 font-mono group-hover:text-white transition-all uppercase">Mount_Drive >></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'FPS_HUNT' && (
            <FPSCanvas player={playerStats} onVictory={() => setPhase('SPACE_SHOOTER')} onDamage={handlePlayerDamage} />
        )}

        {phase === 'SPACE_SHOOTER' && (
            <SpaceShooterCanvas playerStats={playerStats} onVictory={() => setPhase('SIDE_SCROLLER')} onGameOver={() => setPhase('GAME_OVER')} onDamage={handlePlayerDamage} />
        )}

        {phase === 'SIDE_SCROLLER' && (
            <SideScrollerCanvas playerStats={playerStats} onVictory={() => setPhase('MATRIX_BREACH')} onDamage={handlePlayerDamage} />
        )}

        {phase === 'MATRIX_BREACH' && (
            <MatrixBreachCanvas onVictory={() => setPhase('CELEBRATION')} onDamage={handlePlayerDamage} />
        )}

        {phase === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/90 z-40 p-10 space-y-8 animate-in fade-in zoom-in">
            <h2 className="text-6xl text-yellow-400 font-bold retro-font text-center glow-text leading-tight">CORE_BYPASSED</h2>
            <p className="text-cyan-200 font-mono text-xl max-w-lg text-center uppercase tracking-[0.2em] leading-relaxed">
                Infiltration successful. Initializing Phase 2: Total Data Hunt.
            </p>
            <Button variant="secondary" onClick={() => setPhase('FPS_HUNT')} size="lg">Begin The Hunt</Button>
          </div>
        )}

        {phase === 'CELEBRATION' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/95 z-50 p-10 space-y-10">
            <h2 className="text-8xl text-emerald-400 font-bold retro-font text-center glow-text">ASCENSION</h2>
            <div className="space-y-4 text-center">
                <p className="text-emerald-200 font-mono text-xl uppercase tracking-[0.3em]">Protocol Complete.</p>
                <p className="text-emerald-500/60 font-mono text-xs max-w-md mx-auto">All sectors localized. Simulation recalibrating for infinite loop...</p>
            </div>
            <Button variant="primary" onClick={() => {
              setPrestige(p => p + 1);
              setPhase('MENU');
            }}>Loop Frequency (Prestige {prestige + 1})</Button>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 z-50 p-10 space-y-8 animate-in slide-in-from-top">
            <h2 className="text-8xl text-red-600 font-bold retro-font text-center glow-text">FATAL_ERR</h2>
            <p className="text-red-200 font-mono tracking-[0.5em] uppercase text-sm">System integrity: 0.00%</p>
            <Button variant="danger" onClick={() => setPhase('MENU')} size="lg">Hard Reboot</Button>
          </div>
        )}

      </div>
      
      <div className="absolute bottom-6 right-6 font-mono text-[10px] text-zinc-800 select-none pointer-events-none tracking-[1em] opacity-40 uppercase">
        Prestige_{prestige} // Sector_{level} // Rogue_Active
      </div>
    </div>
  );
};

export default App;
