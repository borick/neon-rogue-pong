import { EnemyStats, Upgrade, PlayerStats } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 15;
export const BALL_SIZE = 12;
export const INITIAL_BALL_SPEED = 5; 
export const MAX_BALL_SPEED = 18;

export const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 8,
  maxHp: 8,
  stamina: 150,
  maxStamina: 150,
  score: 0,
  paddleHeight: 110, 
  paddleSpeed: 14,  
  ballPower: 1.02,
  ballSpeedMult: 1.0,
  enemySpeedMult: 1.0,
  vampirism: 1, // Start with some vampirism for sustain
  shield: 3,    // Start with some shield
  maxShield: 3, 
  weaponLevel: 1, // Start with basic weapon active
  shootCooldown: 20,
  currentCooldown: 0,
  prestige: 0,
  hasArchitectKey: false,
  chronoTrigger: false
};

export const ENEMIES: EnemyStats[] = [
  { name: "Sentry Drone", hp: 2, maxHp: 2, paddleHeight: 70, paddleSpeed: 3, reactionDelay: 35, errorMargin: 60, color: '#34d399', style: 'DEFENSIVE' },
  { name: "Vanguard Unit", hp: 4, maxHp: 4, paddleHeight: 80, paddleSpeed: 4, reactionDelay: 25, errorMargin: 40, color: '#60a5fa', style: 'AGGRESSIVE' },
  { name: "Ghost Protocol", hp: 6, maxHp: 6, paddleHeight: 60, paddleSpeed: 8, reactionDelay: 15, errorMargin: 20, color: '#facc15', style: 'CALCULATING' },
  { name: "Heavy Bastion", hp: 10, maxHp: 10, paddleHeight: 200, paddleSpeed: 2, reactionDelay: 10, errorMargin: 15, color: '#f87171', style: 'DEFENSIVE' },
  { name: "THE ARCHITECT", hp: 25, maxHp: 25, paddleHeight: 120, paddleSpeed: 10, reactionDelay: 5, errorMargin: 10, color: '#f472b6', style: 'CALCULATING' },
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'architect_key',
    name: 'Architect\'s Key',
    description: 'Bypass the root. Hitting the center line at high speed triggers a Sub-Grid breach.',
    rarity: 'legendary',
    apply: (s) => ({ ...s, hasArchitectKey: true }),
  },
  {
    id: 'chrono_trigger',
    name: 'Chrono Trigger',
    description: 'Manual Time Slow. Hold [SHIFT] to slow reality at the cost of stamina.',
    rarity: 'legendary',
    apply: (s) => ({ ...s, chronoTrigger: true }),
  },
  {
    id: 'hyper_blaster',
    name: 'Hyper Blaster',
    description: 'Upgrade energy weapon. Higher damage and faster fire rate.',
    rarity: 'rare',
    apply: (s) => ({ ...s, weaponLevel: s.weaponLevel + 1, shootCooldown: Math.max(5, s.shootCooldown - 8) }),
  },
  {
    id: 'vampire_code',
    name: 'Vampire.exe',
    description: 'High chance to heal 1 HP on scoring or major enemy hit.',
    rarity: 'rare',
    apply: (s) => ({ ...s, vampirism: s.vampirism + 2 }),
  },
  {
    id: 'titan_shield',
    name: 'Titan Aegis',
    description: 'Gain +4 Max Shield. Shields regenerate at sector start.',
    rarity: 'rare',
    apply: (s) => ({ ...s, maxShield: s.maxShield + 4, shield: s.maxShield + 4 }),
  },
  {
    id: 'overclocked_paddle',
    name: 'Overclocked Drive',
    description: 'Massive boost to movement speed and paddle size.',
    rarity: 'common',
    apply: (s) => ({ ...s, paddleSpeed: s.paddleSpeed + 6, paddleHeight: s.paddleHeight + 40 }),
  },
  {
    id: 'nano_repair',
    name: 'Nano-Repair',
    description: 'Instantly restore all HP and gain +5 Max HP.',
    rarity: 'common',
    apply: (s) => ({ ...s, maxHp: s.maxHp + 5, hp: s.maxHp + 5 }),
  }
];