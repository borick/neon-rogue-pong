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
    if (u.id === 'fire_rate' && stats.weaponLevel === 0) return false;
    if (u.id === 'weapon_1' && stats.weaponLevel >= 1) return false;
    if (u.id === 'weapon_2' && stats.weaponLevel >= 2) return false;
    if (u.id === 'weapon_3' && stats.weaponLevel >= 3) return false;
    return true;
  });

  const results: Upgrade[] = [];
  const pool = [...validUpgrades];

  while (results.length < count && pool.length > 0) {
    const roll = Math.random();
    let targetRarity: Upgrade['rarity'] = 'common';
    if (roll < 0.05) targetRarity = 'legendary';
    else if (roll < 0.30) targetRarity = 'rare';
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
  const [level, setLevel] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_PLAYER_STATS);
  const [currentEnemyHp, setCurrentEnemyHp] = useState(1);
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  
  const startGame = () => {
    SoundSystem.init(); 
    setPlayerStats({ ...INITIAL_PLAYER_STATS, currentCooldown: 0 });
    setLevel(1);
    setCurrentEnemyHp(ENEMIES[0].hp);
    setPhase('PLAYING');
  };

  const handleLevelComplete = () => {
    if (level >= ENEMIES.length) {
      setPhase('VICTORY');
      SoundSystem.playLevelUp();
    } else {
      setAvailableUpgrades(getContextualUpgrades(playerStats, 3));
      setPhase('LEVEL_UP');
      SoundSystem.playLevelUp();
    }
  };

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
    setPhase('GAME_OVER');
    SoundSystem.playGameOver();
  };

  const handlePlayerDamage = () => {
    setPlayerStats(prev => {
        if (prev.shield > 0) return { ...prev, shield: prev.shield - 1 };
        const newHp = prev.hp - 1;
        if (newHp <= 0) setTimeout(() => handleGameOver(), 0);
        return { ...prev, hp: newHp };
    });
  };

  const handleEnemyDamage = (amount: number = 1) => {
    if (playerStats.vampirism > 0) {
      setPlayerStats(prev => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + (Math.random() < 0.15 * prev.vampirism ? 1 : 0))
      }));
    }
    setCurrentEnemyHp(prev => {
        const newHp = prev - amount;
        if (newHp <= 0) setTimeout(() => handleLevelComplete(), 500);
        return newHp;
    });
  };

  const currentEnemyIndex = Math.min(level - 1, ENEMIES.length - 1);
  const currentEnemy = ENEMIES[currentEnemyIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020205] relative overflow-hidden">
      <div className="scanlines pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-black to-purple-950/20 pointer-events-none" />

      <div className="relative w-full max-w-4xl aspect-[4/3] bg-zinc-950 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden border border-zinc-800 rounded-lg">
        
        {phase === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-white to-cyan-600 retro-font text-center glow-text tracking-tighter p-4 animate-pulse">
              NEON<br/>ROGUE
            </h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-cyan-400 font-mono tracking-widest text-sm">ENCRYPTION: ACTIVE</p>
              <p className="text-zinc-600 font-mono text-xs uppercase">A roguelike paddle combat simulation</p>
            </div>
            <Button onClick={startGame} size="lg" className="hover:scale-105 transition-transform">Initialize Protocol</Button>
          </div>
        )}

        {phase === 'PLAYING' && (
          <GameCanvas 
            context={{ level, player: playerStats, enemy: currentEnemy }}
            currentEnemyHp={currentEnemyHp}
            onPlayerScore={() => handleEnemyDamage(1)}
            onEnemyScore={handlePlayerDamage}
            onProjectileHit={() => handleEnemyDamage(1)}
          />
        )}

        {phase === 'LEVEL_UP' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30 p-8 backdrop-blur-md">
            <h2 className="text-4xl font-bold text-emerald-400 mb-2 retro-font drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">SECTOR_CLEARED</h2>
            <p className="text-zinc-500 mb-8 font-mono tracking-[0.3em] uppercase text-xs">Select Combat Augmentation...</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl p-4">
              {availableUpgrades.map((upgrade) => (
                <button key={upgrade.id} onMouseEnter={() => SoundSystem.playUiHover()} onClick={() => handleSelectUpgrade(upgrade)} className={`group relative p-6 border-2 flex flex-col items-start text-left min-h-[18rem] justify-between transition-all duration-300 hover:-translate-y-3 hover:scale-105 ${upgrade.rarity === 'legendary' ? 'border-amber-400 bg-amber-950/20 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : upgrade.rarity === 'rare' ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-cyan-500 bg-cyan-950/20'}`}>
                  <div className="w-full">
                    <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 mb-4 inline-block rounded-sm ${upgrade.rarity === 'legendary' ? 'bg-amber-400 text-black' : upgrade.rarity === 'rare' ? 'bg-purple-500 text-white' : 'bg-cyan-500 text-black'}`}>{upgrade.rarity}</div>
                    <h3 className="text-xl font-bold text-white mt-2 retro-font leading-tight group-hover:text-cyan-400 transition-colors">{upgrade.name}</h3>
                    <div className="h-px w-full bg-white/10 my-3" />
                    <p className="text-zinc-400 mt-2 text-xs leading-relaxed font-mono italic">{upgrade.description}</p>
                  </div>
                  <div className="w-full text-right text-[10px] opacity-60 font-mono text-zinc-500 group-hover:opacity-100 group-hover:text-white transition-all">&gt; INITIATE_INSTALL</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 z-40 space-y-6 animate-in fade-in zoom-in duration-500">
            <h2 className="text-6xl md:text-8xl text-red-500 font-bold retro-font glow-text text-center leading-tight">CORE<br/>LOST</h2>
            <div className="text-center font-mono text-red-200 bg-red-900/40 p-4 border border-red-500/50">
                <p className="tracking-widest">SYSTEM_HALTED @ SECTOR {level}</p>
            </div>
            <Button variant="danger" onClick={() => setPhase('MENU')} size="lg">Hard Reboot</Button>
          </div>
        )}

        {phase === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/90 z-40 space-y-6 animate-bounce-slow">
            <h2 className="text-6xl text-yellow-400 font-bold retro-font glow-text text-center leading-tight">OMEGA<br/>BYPASSED</h2>
            <p className="text-cyan-200 font-mono text-xl max-w-lg text-center uppercase tracking-widest">
                Network secured. Accessing grid root...
            </p>
            <div className="w-48 h-1 bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,1)]" />
            <Button variant="primary" onClick={() => {
                setPhase('FPS_HUNT');
                SoundSystem.updateDrone(0, true);
            }} size="lg">Infiltrate the Grid</Button>
          </div>
        )}

        {phase === 'FPS_HUNT' && (
           <FPSCanvas player={playerStats} onVictory={() => setPhase('SIDE_SCROLLER')} />
        )}

        {phase === 'SIDE_SCROLLER' && (
           <SideScrollerCanvas playerStats={playerStats} onVictory={() => setPhase('VICTORY')} />
        )}
      </div>
      
      <div className="absolute bottom-10 left-10 text-[10px] text-zinc-800 font-mono vertical-rl uppercase tracking-[1em] pointer-events-none select-none opacity-20">
        Grid_Infiltration // Deep_Access // Genre_Shift
      </div>
    </div>
  );
};

export default App;