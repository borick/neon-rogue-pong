
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatePhase, PlayerStats, Upgrade, GameContext } from './types';
import { INITIAL_PLAYER_STATS, ENEMIES, UPGRADES, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { Button } from './components/Button';
import GameCanvas from './components/GameCanvas';
import FPSCanvas from './components/FPSCanvas';
import SideScrollerCanvas from './components/SideScrollerCanvas';
import { SoundSystem } from './audio';

const getContextualUpgrades = (stats: PlayerStats, count: number): Upgrade[] => {
  const validUpgrades = UPGRADES.filter(u => {
    if (u.id === 'weapon_1' && stats.weaponLevel >= 1) return false;
    if (u.id === 'weapon_2' && (stats.weaponLevel < 1 || stats.weaponLevel >= 2)) return false;
    if (u.id === 'weapon_3' && (stats.weaponLevel < 2 || stats.weaponLevel >= 3)) return false;
    if (u.id === 'fire_rate' && stats.weaponLevel === 0) return false;
    return true;
  });
  
  const results: Upgrade[] = [];
  const pool = [...validUpgrades];
  
  while (results.length < count && pool.length > 0) {
    const roll = Math.random();
    let targetRarity: Upgrade['rarity'] = 'common';
    if (roll < 0.1) targetRarity = 'legendary';
    else if (roll < 0.35) targetRarity = 'rare';
    else targetRarity = 'common';
    
    let candidates = pool.filter(u => u.rarity === targetRarity);
    if (candidates.length === 0) candidates = pool;
    
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];
    results.push(selected);
    
    const poolIndex = pool.indexOf(selected);
    if (poolIndex > -1) pool.splice(poolIndex, 1);
  }
  return results;
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GameStatePhase>('MENU');
  const [isPaused, setIsPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_PLAYER_STATS);
  const [currentEnemyHp, setCurrentEnemyHp] = useState(1);
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);

  // Handle global pause toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        const pausablePhases: GameStatePhase[] = ['PLAYING', 'FPS_HUNT', 'SIDE_SCROLLER'];
        if (pausablePhases.includes(phase)) {
          setIsPaused(prev => !prev);
          SoundSystem.playUiClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const startGame = () => {
    SoundSystem.init(); 
    setPlayerStats({ ...INITIAL_PLAYER_STATS, currentCooldown: 0 });
    setLevel(1);
    setIsPaused(false);
    setCurrentEnemyHp(ENEMIES[0].hp);
    setPhase('PLAYING');
  };

  const handleLevelComplete = useCallback(() => {
    setIsPaused(false);
    if (level >= ENEMIES.length) {
      setPhase('VICTORY');
      SoundSystem.playLevelUp();
    } else {
      setAvailableUpgrades(getContextualUpgrades(playerStats, 3));
      setPhase('LEVEL_UP');
      SoundSystem.playLevelUp();
    }
  }, [level, playerStats]);

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    SoundSystem.playUpgradeSelect();
    const nextStats = upgrade.apply(playerStats);
    nextStats.shield = nextStats.maxShield; 
    setPlayerStats(nextStats);
    
    const nextLevel = level + 1;
    setLevel(nextLevel);
    if (nextLevel <= ENEMIES.length) {
      setCurrentEnemyHp(ENEMIES[nextLevel - 1].hp); 
      setPhase('PLAYING');
    } else {
       setPhase('VICTORY');
    }
  };

  const handleGameOver = () => {
    setIsPaused(false);
    setPhase('GAME_OVER');
    SoundSystem.playGameOver();
  };

  const handlePlayerDamage = useCallback(() => {
    setPlayerStats(prev => {
        if (prev.shield > 0) {
            return { ...prev, shield: prev.shield - 1 };
        }
        const newHp = prev.hp - 1;
        if (newHp <= 0) {
            setTimeout(() => handleGameOver(), 10);
        }
        return { ...prev, hp: newHp };
    });
  }, []);

  const handleEnemyDamage = useCallback((amount: number = 1) => {
    if (playerStats.vampirism > 0) {
      setPlayerStats(prev => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + (Math.random() < 0.1 * prev.vampirism ? 1 : 0))
      }));
    }
    setCurrentEnemyHp(prev => {
        const newHp = prev - amount;
        if (newHp <= 0) {
            setTimeout(() => handleLevelComplete(), 600);
        }
        return newHp;
    });
  }, [playerStats.vampirism, handleLevelComplete]);

  const currentEnemyIndex = Math.min(level - 1, ENEMIES.length - 1);
  const currentEnemy = ENEMIES[currentEnemyIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative">
      <div className="scanlines pointer-events-none opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-black to-purple-950/20 pointer-events-none" />
      
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-black shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden border border-zinc-800 rounded-xl">
        
        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <h2 className="text-6xl font-bold text-cyan-400 retro-font glow-text mb-8 tracking-widest animate-pulse">PAUSED</h2>
            <div className="flex flex-col gap-4">
              <Button onClick={() => setIsPaused(false)} size="lg">RESUME_SESSION</Button>
              <Button onClick={() => { setIsPaused(false); setPhase('MENU'); }} variant="danger" size="md">ABORT_PROTOCOL</Button>
            </div>
            <p className="text-zinc-500 font-mono text-[10px] mt-12 uppercase tracking-[0.5em]">Press 'P' to return to combat</p>
          </div>
        )}

        {phase === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 space-y-12 animate-in fade-in duration-700">
            <div className="text-center group">
                <h1 className="text-7xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 via-white to-indigo-600 retro-font glow-text tracking-tighter p-4 animate-pulse group-hover:scale-105 transition-transform duration-500">
                NEON<br/>ROGUE
                </h1>
                <div className="flex flex-col items-center gap-4 mt-4">
                    <p className="text-cyan-400 font-mono tracking-[0.5em] text-sm font-semibold animate-bounce uppercase">Access: Granted</p>
                    <div className="w-32 h-1 bg-cyan-500/30 rounded-full" />
                </div>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
                <Button onClick={startGame} size="lg" className="px-16 shadow-[0_0_30px_rgba(6,182,212,0.4)]">INITIALIZE PROTOCOL</Button>
                <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Procedural Neural Combat v4.0</p>
            </div>
          </div>
        )}

        {phase === 'PLAYING' && (
          <GameCanvas 
            context={{ level, player: playerStats, enemy: currentEnemy }}
            currentEnemyHp={currentEnemyHp}
            onPlayerScore={() => handleEnemyDamage(1)}
            onEnemyScore={handlePlayerDamage}
            onProjectileHit={() => handleEnemyDamage(1)}
            isPaused={isPaused}
          />
        )}

        {phase === 'LEVEL_UP' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30 p-12 backdrop-blur-xl animate-in slide-in-from-bottom duration-500">
            <div className="text-center mb-12">
                <h2 className="text-5xl font-bold text-emerald-400 mb-2 retro-font drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]">SECTOR_CLEARED</h2>
                <p className="text-zinc-500 font-mono tracking-[0.4em] uppercase text-xs">Select Neural Augmentation...</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
              {availableUpgrades.map((upgrade) => (
                <button 
                    key={upgrade.id} 
                    onMouseEnter={() => SoundSystem.playUiHover()} 
                    onClick={() => handleSelectUpgrade(upgrade)} 
                    className={`group relative p-8 border-2 flex flex-col items-start text-left min-h-[22rem] justify-between transition-all duration-300 hover:-translate-y-4 hover:shadow-2xl ${
                        upgrade.rarity === 'legendary' ? 'border-amber-400 bg-amber-950/20 shadow-amber-900/40' : 
                        upgrade.rarity === 'rare' ? 'border-purple-500 bg-purple-950/20 shadow-purple-900/40' : 
                        'border-cyan-500 bg-cyan-950/20 shadow-cyan-900/40'
                    }`}
                >
                  <div className="w-full">
                    <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 mb-6 inline-block rounded-sm ${
                        upgrade.rarity === 'legendary' ? 'bg-amber-400 text-black' : 
                        upgrade.rarity === 'rare' ? 'bg-purple-500 text-white' : 
                        'bg-cyan-500 text-black'
                    }`}>{upgrade.rarity}</div>
                    <h3 className="text-2xl font-bold text-white mt-2 retro-font leading-tight group-hover:text-cyan-400 transition-colors">{upgrade.name}</h3>
                    <div className="h-0.5 w-12 bg-white/20 my-4 group-hover:w-full transition-all duration-500" />
                    <p className="text-zinc-400 mt-2 text-sm leading-relaxed font-mono italic">{upgrade.description}</p>
                  </div>
                  <div className="w-full text-right text-[10px] opacity-60 font-mono text-zinc-500 group-hover:opacity-100 group-hover:text-white transition-all">&gt; INSTALL_CHIP</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 z-40 space-y-8 animate-in zoom-in duration-700">
            <h2 className="text-7xl md:text-9xl text-red-500 font-bold retro-font glow-text text-center leading-tight">CORE<br/>LOST</h2>
            <div className="text-center font-mono text-red-200 bg-red-900/40 p-6 border border-red-500/50 rounded shadow-xl">
                <p className="tracking-widest uppercase text-xl font-bold">SYSTEM_HALTED</p>
                <p className="mt-2 text-red-400/80">TERMINATED AT SECTOR {level}</p>
            </div>
            <Button variant="danger" onClick={() => setPhase('MENU')} size="lg" className="px-20">HARD REBOOT</Button>
          </div>
        )}

        {phase === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/95 z-40 space-y-10">
            <h2 className="text-7xl text-yellow-400 font-bold retro-font glow-text text-center leading-tight animate-bounce">OMEGA<br/>BYPASSED</h2>
            <div className="space-y-4 text-center">
                <p className="text-cyan-200 font-mono text-xl max-w-lg uppercase tracking-widest">
                    Network infrastructure compromised. Root access granted.
                </p>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_20px_rgba(250,204,21,1)]" />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
                <Button variant="primary" onClick={() => {
                    setPhase('FPS_HUNT');
                    setIsPaused(false);
                    SoundSystem.updateDrone(0, true);
                }} size="lg">INFILTRATE GRID (FPS)</Button>
                <Button variant="secondary" onClick={() => { setPhase('SIDE_SCROLLER'); setIsPaused(false); }} size="lg">UPLINK (PLATFORM)</Button>
            </div>
            <button onClick={() => setPhase('MENU')} className="text-zinc-500 uppercase font-mono text-xs hover:text-white transition-colors">Return to login</button>
          </div>
        )}

        {phase === 'FPS_HUNT' && (
           <FPSCanvas player={playerStats} onVictory={() => setPhase('SIDE_SCROLLER')} onExit={() => setPhase('MENU')} isPaused={isPaused} />
        )}

        {phase === 'SIDE_SCROLLER' && (
           <SideScrollerCanvas playerStats={playerStats} onVictory={() => setPhase('VICTORY')} onExit={() => setPhase('MENU')} isPaused={isPaused} />
        )}
      </div>

      <div className="absolute bottom-8 left-8 text-[10px] text-zinc-700 font-mono vertical-rl uppercase tracking-[1.5em] pointer-events-none select-none opacity-20">
        Grid_Infiltration_Unit_09
      </div>
      <div className="absolute top-8 right-8 text-[10px] text-zinc-700 font-mono uppercase tracking-[1em] pointer-events-none select-none opacity-20">
        Auth_Token: 8F92-K1L0-B0T
      </div>
    </div>
  );
};

export default App;
