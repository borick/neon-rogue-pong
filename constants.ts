
import { EnemyStats, Upgrade, PlayerStats, MetaUpgrade, Achievement } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 15;
export const BALL_SIZE = 12;

export const INITIAL_BALL_SPEED = 4.0; 
export const MAX_BALL_SPEED = 45;      

export const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 3,
  maxHp: 3,
  score: 0,
  paddleHeight: 120, 
  paddleSpeed: 10,   
  ballPower: 1.03,   
  ballSpeedMult: 1.0,
  enemySpeedMult: 1.0,
  vampirism: 0,
  shield: 0,
  maxShield: 0,
  magnetism: 0,
  timeDilation: false,
  glitchChance: 0,
  weaponLevel: 0,
  shootCooldown: 35,
  currentCooldown: 0,
};

export const META_UPGRADES: MetaUpgrade[] = [
  {
    id: 'meta_hp',
    name: 'Reinforced Chassis',
    description: '+1 Starting Max HP per rank.',
    cost: 15,
    maxLevel: 5,
    effect: (lvl) => ({ maxHp: INITIAL_PLAYER_STATS.maxHp + lvl, hp: INITIAL_PLAYER_STATS.maxHp + lvl })
  },
  {
    id: 'meta_speed',
    name: 'Overclocked Servos',
    description: '+10% Starting Paddle Speed per rank.',
    cost: 10,
    maxLevel: 10,
    effect: (lvl) => ({ paddleSpeed: INITIAL_PLAYER_STATS.paddleSpeed * (1 + (lvl * 0.10)) })
  },
  {
    id: 'meta_shield',
    name: 'Starter Capacitor',
    description: 'Start every run with +1 Max Shield per rank.',
    cost: 30,
    maxLevel: 3,
    effect: (lvl) => ({ maxShield: lvl, shield: lvl })
  },
  {
    id: 'meta_shards',
    name: 'Shard Uplink',
    description: 'Increase Neural Shard gain by 25% per rank.',
    cost: 20,
    maxLevel: 8,
    effect: () => ({}) 
  },
  {
    id: 'meta_weapon',
    name: 'Armory Pre-Cache',
    description: 'Start the run with the Pulse Blaster (Weapon Lvl 1).',
    cost: 150,
    maxLevel: 1,
    effect: (lvl) => ({ weaponLevel: lvl > 0 ? 1 : 0 })
  }
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_blood', name: 'First Breach', description: 'Defeat the Gateway Guardian.', icon: '⚡' },
  { id: 'flawless', name: 'Ghost in the Shell', description: 'Complete a sector without taking hull damage.', icon: '👻' },
  { id: 'weapon_master', name: 'Singularity', description: 'Reach Weapon Level 3.', icon: '🌌' },
  { id: 'architect_down', name: 'Architect Demise', description: 'Defeat the OMEGA ARCHITECT.', icon: '🏆' },
  { id: 'rich', name: 'Data Miner', description: 'Earn 100 Neural Shards in a single session.', icon: '💎' },
  { id: 'speed_demon', name: 'Kinetic Energy', description: 'Reach a ball speed of 15.0 or higher.', icon: '🏃' },
  { id: 'bullet_hell', name: 'Void Walker', description: 'Defeat the Void Colossus.', icon: '🌀' },
  { id: 'persistent', name: 'Old Guard', description: 'Attempt 10 total runs.', icon: '📜' }
];

export const ENEMIES: EnemyStats[] = [
    {
        name: "Gateway Guardian",
        hp: 1, 
        maxHp: 1,
        paddleHeight: 250, 
        paddleSpeed: 0.7,  
        reactionDelay: 200, 
        errorMargin: 350,  
        color: '#22d3ee'
    },
    {
        name: "Sentry Unit 02",
        hp: 3,
        maxHp: 3,
        paddleHeight: 140,
        paddleSpeed: 5.5,
        reactionDelay: 60,
        errorMargin: 100,
        color: '#4ade80'
    },
    {
        name: "Neural Interceptor",
        hp: 12,
        maxHp: 12,
        paddleHeight: 100,
        paddleSpeed: 14.0,
        reactionDelay: 10,
        errorMargin: 20,
        color: '#f472b6'
    },
    {
        name: "Void Colossus",
        hp: 35,
        maxHp: 35,
        paddleHeight: 350, 
        paddleSpeed: 20.0, 
        reactionDelay: 2,
        errorMargin: 2,
        color: '#818cf8'
    },
    {
        name: "OMEGA ARCHITECT",
        hp: 150, 
        maxHp: 150,
        paddleHeight: 40, 
        paddleSpeed: 40.0,  
        reactionDelay: 0, 
        errorMargin: 0,   
        color: '#facc15'
    }
];

export const UPGRADES: Upgrade[] = [
    {
        id: 'weapon_1',
        name: 'Pulse Blaster',
        description: 'Install frontal energy cannon. Fires manually with Space/Mouse.',
        rarity: 'rare',
        apply: (s) => ({ ...s, weaponLevel: Math.max(s.weaponLevel, 1) }),
    },
    {
        id: 'weapon_2',
        name: 'Twin Railguns',
        description: 'Upgrade to dual high-velocity railguns. Doubled fire rate.',
        rarity: 'rare',
        apply: (s) => ({ ...s, weaponLevel: Math.max(s.weaponLevel, 2), shootCooldown: 20 }),
    },
    {
        id: 'weapon_3',
        name: 'Singularity Beam',
        description: 'EXPERIMENTAL: Ultra-high frequency laser that bypasses armor.',
        rarity: 'legendary',
        apply: (s) => ({ ...s, weaponLevel: 3, shootCooldown: 15 }),
    },
    {
        id: 'fire_rate',
        name: 'Neural Accelerator',
        description: 'Reduces weapon reload time by 50%.',
        rarity: 'common',
        apply: (s) => ({ ...s, shootCooldown: Math.max(6, s.shootCooldown * 0.5) }),
    },
    {
        id: 'shield_up',
        name: 'Fortify Protocol',
        description: 'Gain +1 Max Shield. Shield integrity restored every level.',
        rarity: 'rare',
        apply: (s) => ({ ...s, maxShield: s.maxShield + 1, shield: s.shield + 1 }),
    },
    {
        id: 'magnet_up',
        name: 'Graviton Pulse',
        description: 'The ball is strongly drawn toward your paddle surface.',
        rarity: 'rare',
        apply: (s) => ({ ...s, magnetism: s.magnetism + 0.35 }),
    },
    {
        id: 'time_up',
        name: 'Chrono-Trigger',
        description: 'Slows time by 60% when the ball enters your red zone.',
        rarity: 'legendary',
        apply: (s) => ({ ...s, timeDilation: true }),
    },
    {
        id: 'health_pack',
        name: 'Core Repair',
        description: '+1 Max HP and total system health recovery.',
        rarity: 'common',
        apply: (s) => ({ ...s, maxHp: s.maxHp + 1, hp: s.maxHp + 1 }),
    },
    {
        id: 'speed_up_minor',
        name: 'Overclocked Servos',
        description: 'Increase paddle movement speed by 40%.',
        rarity: 'common',
        apply: (s) => ({ ...s, paddleSpeed: s.paddleSpeed * 1.4 }),
    }
];
