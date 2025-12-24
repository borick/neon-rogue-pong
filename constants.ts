import { EnemyStats, Upgrade } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 15;
export const BALL_SIZE = 10;
export const INITIAL_BALL_SPEED = 6.5; 
export const MAX_BALL_SPEED = 18;

export const INITIAL_PLAYER_STATS: any = {
  hp: 3,
  maxHp: 3,
  score: 0,
  paddleHeight: 85, 
  paddleSpeed: 9,  
  ballPower: 1.04,
  ballSpeedMult: 1.0,
  enemySpeedMult: 1.0,
  vampirism: 0,
  shield: 0,
  maxShield: 0,
  magnetism: 0,
  timeDilation: false,
  glitchChance: 0,
  weaponLevel: 0,
  shootCooldown: 30, // Frames
  currentCooldown: 0,
};

export const ENEMIES: EnemyStats[] = [
  {
    name: "Tutorial Drone",
    hp: 1, 
    maxHp: 1,
    paddleHeight: 80,
    paddleSpeed: 3.5,
    reactionDelay: 25,
    errorMargin: 50,
    color: '#34d399', 
  },
  {
    name: "Sentry Unit",
    hp: 3,
    maxHp: 3,
    paddleHeight: 90,
    paddleSpeed: 4.5,
    reactionDelay: 15,
    errorMargin: 30,
    color: '#60a5fa', 
  },
  {
    name: "Interceptor",
    hp: 4,
    maxHp: 4,
    paddleHeight: 70,
    paddleSpeed: 9,
    reactionDelay: 8,
    errorMargin: 15,
    color: '#facc15', 
  },
  {
    name: "Heavy Tank",
    hp: 8,
    maxHp: 8,
    paddleHeight: 200,
    paddleSpeed: 3.5,
    reactionDelay: 5,
    errorMargin: 5,
    color: '#f87171', 
  },
  {
    name: "OMEGA CORE",
    hp: 20,
    maxHp: 20,
    paddleHeight: 180,
    paddleSpeed: 10,
    reactionDelay: 0,
    errorMargin: 0,
    color: '#f472b6', 
  },
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'weapon_1',
    name: 'Pulse Blaster',
    description: 'Install frontal energy cannon. Fires on hit or manual trigger.',
    rarity: 'rare',
    apply: (s) => ({ ...s, weaponLevel: Math.max(s.weaponLevel, 1) }),
  },
  {
    id: 'weapon_2',
    name: 'Twin Railguns',
    description: 'Upgrade to dual high-velocity railguns. Pierces through defense.',
    rarity: 'rare',
    apply: (s) => ({ ...s, weaponLevel: Math.max(s.weaponLevel, 2), shootCooldown: 20 }),
  },
  {
    id: 'weapon_3',
    name: 'Omega Beam',
    description: 'ANNIHILATION: A massive beam that ignores physics and shreds cores.',
    rarity: 'legendary',
    apply: (s) => ({ ...s, weaponLevel: 3, shootCooldown: 15 }),
  },
  {
    id: 'fire_rate',
    name: 'Rapid Reloader',
    description: 'Advanced servo-reloaders. Increase fire rate by 40%.',
    rarity: 'common',
    apply: (s) => ({ ...s, shootCooldown: Math.max(5, s.shootCooldown * 0.6) }),
  },
  {
    id: 'shield_up',
    name: 'Aegis Protocol',
    description: 'Gain +1 Shield health every level start (blocks hits).',
    rarity: 'rare',
    apply: (s) => ({ ...s, maxShield: s.maxShield + 1, shield: s.shield + 1 }),
  },
  {
    id: 'magnet_up',
    name: 'Gravity Well',
    description: 'The ball is magnetically attracted to your paddle.',
    rarity: 'rare',
    apply: (s) => ({ ...s, magnetism: s.magnetism + 0.15 }),
  },
  {
    id: 'time_up',
    name: 'Reflex Overdrive',
    description: 'Time slows down when the ball is close to your side.',
    rarity: 'legendary',
    apply: (s) => ({ ...s, timeDilation: true }),
  },
  {
    id: 'paddle_huge',
    name: 'Titan Shield',
    description: 'Massively increase paddle height (+50%).',
    rarity: 'legendary',
    apply: (s) => ({ ...s, paddleHeight: s.paddleHeight * 1.5 }),
  },
  {
    id: 'health_pack',
    name: 'Emergency Patch',
    description: 'Fully repair systems (+Max HP & Full Heal).',
    rarity: 'common',
    apply: (s) => ({ ...s, maxHp: s.maxHp + 1, hp: s.maxHp + 1 }),
  },
  {
    id: 'slow_ball',
    name: 'Stasis Field',
    description: 'Permanently reduce global ball speed by 15%.',
    rarity: 'common',
    apply: (s) => ({ ...s, ballSpeedMult: s.ballSpeedMult * 0.85 }),
  },
  {
    id: 'size_up_minor',
    name: 'Micro-Extension',
    description: 'Minor increase to paddle height (+15%).',
    rarity: 'common',
    apply: (s) => ({ ...s, paddleHeight: s.paddleHeight * 1.15 }),
  },
  {
    id: 'speed_up_minor',
    name: 'Voltage Surge',
    description: 'Increase paddle movement speed by 25%.',
    rarity: 'common',
    apply: (s) => ({ ...s, paddleSpeed: s.paddleSpeed * 1.25 }),
  },
];