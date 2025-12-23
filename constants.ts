import { EnemyStats, Upgrade } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 15;
export const BALL_SIZE = 10;
export const INITIAL_BALL_SPEED = 7;
export const MAX_BALL_SPEED = 18;

export const INITIAL_PLAYER_STATS = {
  hp: 3,
  maxHp: 3,
  score: 0,
  paddleHeight: 80,
  paddleSpeed: 8,
  ballPower: 1.05,
};

// Enemy Definitions
export const ENEMIES: EnemyStats[] = [
  {
    name: "Drone Unit Alpha",
    hp: 3,
    maxHp: 3,
    paddleHeight: 80,
    paddleSpeed: 5,
    reactionDelay: 15,
    errorMargin: 30,
    color: '#ef4444', // Red-500
  },
  {
    name: "Blockade Bot",
    hp: 5,
    maxHp: 5,
    paddleHeight: 120,
    paddleSpeed: 4,
    reactionDelay: 10,
    errorMargin: 10,
    color: '#f97316', // Orange-500
  },
  {
    name: "Speedster MK-II",
    hp: 4,
    maxHp: 4,
    paddleHeight: 60,
    paddleSpeed: 10,
    reactionDelay: 5,
    errorMargin: 20,
    color: '#eab308', // Yellow-500
  },
  {
    name: "The Architect",
    hp: 6,
    maxHp: 6,
    paddleHeight: 90,
    paddleSpeed: 8,
    reactionDelay: 2,
    errorMargin: 5,
    color: '#a855f7', // Purple-500
  },
  {
    name: "OMEGA CORE",
    hp: 10,
    maxHp: 10,
    paddleHeight: 150,
    paddleSpeed: 12,
    reactionDelay: 0,
    errorMargin: 0,
    color: '#ec4899', // Pink-500
  },
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'hp_boost',
    name: 'Nanobot Repair',
    description: '+1 Max HP and Restore Health',
    rarity: 'common',
    apply: (s) => ({ ...s, maxHp: s.maxHp + 1, hp: s.maxHp + 1 }),
  },
  {
    id: 'paddle_size',
    name: 'Shield Extender',
    description: '+20% Paddle Height',
    rarity: 'common',
    apply: (s) => ({ ...s, paddleHeight: s.paddleHeight * 1.2 }),
  },
  {
    id: 'paddle_speed',
    name: 'Servo Overclock',
    description: '+15% Movement Speed',
    rarity: 'common',
    apply: (s) => ({ ...s, paddleSpeed: s.paddleSpeed * 1.15 }),
  },
  {
    id: 'ball_power',
    name: 'Kinetic Amplifier',
    description: 'Ball accelerates faster after your hits',
    rarity: 'rare',
    apply: (s) => ({ ...s, ballPower: s.ballPower + 0.05 }),
  },
  {
    id: 'heal_full',
    name: 'System Reboot',
    description: 'Fully restore HP',
    rarity: 'common',
    apply: (s) => ({ ...s, hp: s.maxHp }),
  },
  {
    id: 'legendary_size',
    name: 'Titanium Wall',
    description: '+50% Paddle Height',
    rarity: 'legendary',
    apply: (s) => ({ ...s, paddleHeight: s.paddleHeight * 1.5 }),
  },
];
