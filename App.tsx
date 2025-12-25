
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatePhase, PlayerStats, Upgrade, GameContext, SaveData, Achievement } from './types';
import { INITIAL_PLAYER_STATS, ENEMIES, UPGRADES, CANVAS_WIDTH, CANVAS_HEIGHT, META_UPGRADES, ACHIEVEMENTS_LIST } from './constants';
import { Button } from './components/Button';
import GameCanvas from './components/GameCanvas';
import FPSCanvas from './components/FPSCanvas';
import SideScrollerCanvas from './components/SideScrollerCanvas';
import { SoundSystem } from './audio';
import { Persistence } from './persistence';

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
  const [save, setSave] = useState<SaveData>(Persistence.load());
  const [phase, setPhase] = useState<GameStatePhase>('MENU');
  const [isPaused, setIsPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_PLAYER_STATS);
  const [currentEnemyHp, setCurrentEnemyHp] = useState(1);
  const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [shardsEarnedThisRun, setShardsEarnedThisRun] = useState(0);

  // Stats for achievements
  const [damagedTakenThisSector, setDamagedTakenThisSector] = useState(0);

  // Sync save to storage when it changes
  useEffect(() => {
    Persistence.save(save);
  }, [save]);

  const triggerAchievement = useCallback((id: string) => {
    if (save.unlockedAchievements.includes(id)) return;
    const achieve = ACHIEVEMENTS_LIST.find(a => a.id === id);
    if (achieve) {
      SoundSystem.playAchievement();
      setActiveAchievement(achieve);
      setSave(prev => ({ ...prev, unlockedAchievements: [...prev.unlockedAchievements, id] }));
      setTimeout(() => setActiveAchievement(null), 4000);
    }
  }, [save.unlockedAchievements]);

  const startGame = () => {
    SoundSystem.init(); 
    
    // Apply Meta Progression
    let baseStats = { ...INITIAL_PLAYER_STATS };
    META_UPGRADES.forEach(meta => {
      const lvl = save.metaLevels[meta.id] || 0;
      if (lvl > 0) {
        baseStats = { ...baseStats, ...meta.effect(lvl) };
      }
    });

    setPlayerStats(baseStats);
    setLevel(1);
    setIsPaused(false);
    setCurrentEnemyHp(ENEMIES[0].hp);
    setShardsEarnedThisRun(0);
    setDamagedTakenThisSector(0);
    setPhase('PLAYING');
  };

  const handleLevelComplete = useCallback(() => {
    setIsPaused(false);
    
    // Achievement checks
    if (level === 1) triggerAchievement('first_blood');
    if (damagedTakenThisSector === 0) triggerAchievement('flawless');

    // Reward shards
    const shards = level * 5;
    setShardsEarnedThisRun(prev => prev + shards);
    setSave(prev => ({ ...prev, shards: prev.shards + shards, totalShardsEarned: prev.totalShardsEarned + shards }));

    if (level >= ENEMIES.length) {
      triggerAchievement('architect_down');
      setPhase('VICTORY');
      SoundSystem.playLevelUp();
    } else {
      setAvailableUpgrades(getContextualUpgrades(playerStats, 3));
      setPhase('LEVEL_UP');
      SoundSystem.playLevelUp();
      setDamagedTakenThisSector(0);
    }
  }, [level, playerStats, damagedTakenThisSector, triggerAchievement]);

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    SoundSystem.playUpgradeSelect();
    const nextStats = upgrade.apply(playerStats);
    nextStats.shield = nextStats.maxShield; 
    setPlayerStats(nextStats);

    if (nextStats.weaponLevel === 3) triggerAchievement('weapon_master');
    
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
    setDamagedTakenThisSector(prev => prev + 1);
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

  const resetSave = () => {
    if (confirm("THIS WILL WIPE ALL DATA. ARE YOU SURE?")) {
      setSave(Persistence.reset());
      SoundSystem.playUiClick();
    }
  };

  const currentEnemyIndex = Math.min(level - 1, ENEMIES.length - 1);
  const currentEnemy = ENEMIES[currentEnemyIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative">
      <div className="scanlines pointer-events-none opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-black to-purple-950/20 pointer-events-none" />
      
      {/* Achievement Toast */}
      {activeAchievement && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 border-2 border-amber-400 p-4 rounded shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-12 duration-500">
          <div className="text-3xl">{activeAchievement.icon}</div>
          <div>
            <div className="text-amber-400 font-bold retro-font text-[10px] tracking-widest">ACHIEVEMENT_UNLOCKED</div>
            <div className="text-white font-bold">{activeAchievement.name}</div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-4xl aspect-[4/3] bg-black shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden border border-zinc-800 rounded-xl">
        
        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-md">
            <h2 className="text-6xl font-bold text-cyan-400 retro-font glow-text mb-8 tracking-widest animate-pulse">PAUSED</h2>
            <div className="flex flex-col gap-4">
              <Button onClick={() => setIsPaused(false)} size="lg">RESUME_SESSION</Button>
              <Button onClick={() => { setIsPaused(false); setPhase('MENU'); }} variant="danger" size="md">ABORT_PROTOCOL</Button>
            </div>
          </div>
        )}

        {phase === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 space-y-8 animate-in fade-in duration-700">
            <div className="text-center group">
                <h1 className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 via-white to-indigo-600 retro-font glow-text tracking-tighter p-4 group-hover:scale-105 transition-transform duration-500">
                NEON<br/>ROGUE
                </h1>
                <div className="mt-2 text-cyan-400 font-mono text-[10px] uppercase tracking-[0.5em] animate-pulse">v1.1 - Neural Override</div>
            </div>
            
            <div className="flex flex-col items-center space-y-4 w-full max-w-xs">
                <Button onClick={startGame} size="lg" className="w-full">INITIALIZE RUN</Button>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button variant="secondary" onClick={() => setPhase('META_LAB')} size="sm">META_LAB</Button>
                  <Button variant="secondary" onClick={() => setPhase('ACHIEVEMENTS')} size="sm">LOGS</Button>
                </div>
                <button onClick={resetSave} className="text-red-900 hover:text-red-500 transition-colors uppercase text-[9px] font-mono tracking-widest mt-4">Reset System</button>
            </div>

            <div className="absolute bottom-8 right-8 text-right font-mono">
              <div className="text-zinc-600 text-[10px] uppercase">Neural_Shards</div>
              <div className="text-amber-400 text-xl font-bold glow-text">◊ {save.shards}</div>
            </div>
          </div>
        )}

        {phase === 'META_LAB' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-30 p-12">
            <h2 className="text-4xl font-bold text-amber-400 mb-8 retro-font">NEURAL_LAB</h2>
            <div className="grid grid-cols-1 gap-6 w-full max-w-2xl">
              {META_UPGRADES.map(meta => {
                const currentLvl = save.metaLevels[meta.id] || 0;
                const isMax = currentLvl >= meta.maxLevel;
                const cost = meta.cost * (currentLvl + 1);

                return (
                  <div key={meta.id} className="bg-zinc-900 border border-zinc-700 p-6 rounded flex items-center justify-between group hover:border-amber-400 transition-colors">
                    <div>
                      <h3 className="text-white font-bold text-lg">{meta.name} <span className="text-zinc-500 font-mono text-xs">LVL {currentLvl}/{meta.maxLevel}</span></h3>
                      <p className="text-zinc-400 text-sm italic">{meta.description}</p>
                    </div>
                    <button 
                      disabled={isMax || save.shards < cost}
                      onClick={() => {
                        setSave(prev => ({
                          ...prev,
                          shards: prev.shards - cost,
                          metaLevels: { ...prev.metaLevels, [meta.id]: currentLvl + 1 }
                        }));
                        SoundSystem.playUpgradeSelect();
                      }}
                      className={`px-6 py-3 rounded font-bold transition-all ${isMax ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : (save.shards >= cost ? 'bg-amber-500 text-black hover:scale-105' : 'bg-red-900/20 text-red-500 border border-red-500/50 cursor-not-allowed')}`}
                    >
                      {isMax ? 'MAXED' : `◊ ${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <Button className="mt-12" variant="danger" onClick={() => setPhase('MENU')}>RETURN_TO_TERMINAL</Button>
          </div>
        )}

        {phase === 'ACHIEVEMENTS' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-30 p-12">
            <h2 className="text-4xl font-bold text-cyan-400 mb-8 retro-font">SYSTEM_LOGS</h2>
            <div className="grid grid-cols-2 gap-4 w-full overflow-y-auto max-h-[60vh] p-4">
              {ACHIEVEMENTS_LIST.map(a => {
                const unlocked = save.unlockedAchievements.includes(a.id);
                return (
                  <div key={a.id} className={`p-4 border rounded flex items-center gap-4 transition-all ${unlocked ? 'border-cyan-500 bg-cyan-950/20 opacity-100' : 'border-zinc-800 bg-zinc-900/50 opacity-40 grayscale'}`}>
                    <div className="text-3xl">{unlocked ? a.icon : '🔒'}</div>
                    <div>
                      <div className="text-white font-bold text-sm uppercase">{a.name}</div>
                      <div className="text-zinc-400 text-[10px] leading-tight mt-1">{a.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="mt-12" variant="danger" onClick={() => setPhase('MENU')}>RETURN_TO_TERMINAL</Button>
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
            <div className="text-center mb-8">
                <h2 className="text-5xl font-bold text-emerald-400 mb-2 retro-font">SECTOR_CLEARED</h2>
                <p className="text-zinc-500 font-mono tracking-[0.4em] uppercase text-xs">Accessing Neural Augmentation...</p>
                <div className="text-amber-400 font-mono text-[10px] mt-2">+ ◊ {level * 5} Neural Shards Gathered</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
              {availableUpgrades.map((upgrade) => (
                <button 
                    key={upgrade.id} 
                    onMouseEnter={() => SoundSystem.playUiHover()} 
                    onClick={() => handleSelectUpgrade(upgrade)} 
                    className={`group relative p-6 border-2 flex flex-col items-start text-left min-h-[20rem] justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                        upgrade.rarity === 'legendary' ? 'border-amber-400 bg-amber-950/20 shadow-amber-900/40' : 
                        upgrade.rarity === 'rare' ? 'border-purple-500 bg-purple-950/20 shadow-purple-900/40' : 
                        'border-cyan-500 bg-cyan-950/20 shadow-cyan-900/40'
                    }`}
                >
                  <div className="w-full">
                    <div className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 mb-4 inline-block rounded-sm ${
                        upgrade.rarity === 'legendary' ? 'bg-amber-400 text-black' : 
                        upgrade.rarity === 'rare' ? 'bg-purple-500 text-white' : 
                        'bg-cyan-500 text-black'
                    }`}>{upgrade.rarity}</div>
                    <h3 className="text-xl font-bold text-white mt-1 retro-font leading-tight">{upgrade.name}</h3>
                    <p className="text-zinc-400 mt-4 text-xs font-mono leading-relaxed">{upgrade.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 z-40 space-y-8">
            <h2 className="text-8xl text-red-500 font-bold retro-font glow-text text-center">CORE<br/>LOST</h2>
            <div className="text-center font-mono text-red-200 bg-red-900/40 p-6 border border-red-500/50 rounded">
                <p className="tracking-widest uppercase text-xl font-bold">SYSTEM_HALTED</p>
                <p className="mt-2 text-red-400/80">TERMINATED AT SECTOR {level}</p>
                <p className="mt-4 text-amber-400 font-bold tracking-widest">+ ◊ {shardsEarnedThisRun} SHARDS RECOVERED</p>
            </div>
            <Button variant="danger" onClick={() => setPhase('MENU')} size="lg" className="px-20">HARD REBOOT</Button>
          </div>
        )}

        {phase === 'VICTORY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/95 z-40 space-y-10">
            <h2 className="text-6xl text-yellow-400 font-bold retro-font glow-text text-center animate-bounce">OMEGA<br/>BYPASSED</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <Button variant="primary" onClick={() => {
                    setPhase('FPS_HUNT');
                    setIsPaused(false);
                    SoundSystem.updateDrone(0, true);
                }} size="lg">INFILTRATE GRID</Button>
                <Button variant="secondary" onClick={() => { setPhase('SIDE_SCROLLER'); setIsPaused(false); }} size="lg">DATA UPLINK</Button>
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
    </div>
  );
};

export default App;
