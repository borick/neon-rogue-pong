
import { EnemyStats, Upgrade, PlayerStats } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 15;
export const BALL_SIZE = 12;

// EASIER START: Reduced initial speed
export const INITIAL_BALL_SPEED = 5.0; 
// HARDER LATE GAME: Increased max speed cap
export const MAX_BALL_SPEED = 22;

export const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 3,
  maxHp: 3,
  score: 0,
  paddleHeight: 100, // Slightly larger starting paddle for ease
  paddleSpeed: 8,  
  ballPower: 1.05,
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

export const ENEMIES: EnemyStats[] = [
    {
        name: "Gateway Guardian",
        hp: 1, 
        maxHp: 1,
        paddleHeight: 120, // Easier to hit
        paddleSpeed: 3.0,  // Slower
        reactionDelay: 35, // High delay
        errorMargin: 60,   // High error
        color: '#22d3ee'
    },
    {
        name: "Sentry Unit 02",
        hp: 3,
        maxHp: 3,
        paddleHeight: 90,
        paddleSpeed: 4.8,
        reactionDelay: 15,
        errorMargin: 30,
        color: '#4ade80'
    },
    {
        name: "Neural Interceptor",
        hp: 5,
        maxHp: 5,
        paddleHeight: 75,
        paddleSpeed: 8.5,
        reactionDelay: 8,
        errorMargin: 15,
        color: '#f472b6'
    },
    {
        name: "Void Colossus",
        hp: 10,
        maxHp: 10,
        paddleHeight: 220,
        paddleSpeed: 4.0,
        reactionDelay: 5,
        errorMargin: 8,
        color: '#818cf8'
    },
    {
        name: "OMEGA ARCHITECT",
        hp: 25, // Harder boss
        maxHp: 25,
        paddleHeight: 160,
        paddleSpeed: 12,
        reactionDelay: 1,
        errorMargin: 2,
        color: '#facc15'
    }
];

export const UPGRADES: Upgrade[] = [
    {
        id: 'weapon_1',
        name: 'Pulse Blaster',
        description: 'Install frontal energy cannon. Fires on contact or manually.',
        rarity: 'rare',
        apply: (s) => ({ ...s, weaponLevel: Math.max(s.weaponLevel, 1) }),
    },
    {
        id: 'weapon_2',
        name: 'Twin Railguns',
        description: 'Upgrade to dual high-velocity railguns. Massive kinetic energy.',
        rarity: 'rare',
        apply: (s) => ({ ...s, weaponLevel: Math.max(s.weaponLevel, 2), shootCooldown: 25 }),
    },
    {
        id: 'weapon_3',
        name: 'Singularity Beam',
        description: 'EXPERIMENTAL: High-intensity laser that shreds through digital defenses.',
        rarity: 'legendary',
        apply: (s) => ({ ...s, weaponLevel: 3, shootCooldown: 20 }),
    },
    {
        id: 'fire_rate',
        name: 'Overclocked Buffer',
        description: 'Reduces weapon cooldown by 40%.',
        rarity: 'common',
        apply: (s) => ({ ...s, shootCooldown: Math.max(8, s.shootCooldown * 0.6) }),
    },
    {
        id: 'shield_up',
        name: 'Fortify.exe',
        description: 'Gain +1 Max Shield. Shields refresh every level.',
        rarity: 'rare',
        apply: (s) => ({ ...s, maxShield: s.maxShield + 1, shield: s.shield + 1 }),
    },
    {
        id: 'magnet_up',
        name: 'Flux Magnet',
        description: 'The ball is drawn toward your paddle through electromagnetic fields.',
        rarity: 'rare',
        apply: (s) => ({ ...s, magnetism: s.magnetism + 0.2 }),
    },
    {
        id: 'time_up',
        name: 'Slow-Mo Matrix',
        description: 'Slows time significantly when the ball enters your red zone.',
        rarity: 'legendary',
        apply: (s) => ({ ...s, timeDilation: true }),
    },
    {
        id: 'health_pack',
        name: 'System Restore',
        description: '+1 Max HP and full system repair.',
        rarity: 'common',
        apply: (s) => ({ ...s, maxHp: s.maxHp + 1, hp: s.maxHp + 1 }),
    },
    {
        id: 'speed_up_minor',
        name: 'Turbo Boost',
        description: 'Increase paddle movement speed by 30%.',
        rarity: 'common',
        apply: (s) => ({ ...s, paddleSpeed: s.paddleSpeed * 1.3 }),
    }
];
