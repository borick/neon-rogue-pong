export type GameStatePhase = 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER' | 'VICTORY' | 'FPS_HUNT' | 'SIDE_SCROLLER';

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  pos: Vector;
  width: number;
  height: number;
  color: string;
}

export interface Particle {
  id: number;
  pos: Vector;
  vel: Vector;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Projectile {
  id: number;
  pos: Vector;
  vel: Vector;
  width: number;
  height: number;
  color: string;
  active: boolean;
  damage: number;
}

export interface Ball extends Entity {
  vel: Vector;
  speed: number;
  active: boolean;
}

export interface Paddle extends Entity {
  speed: number;
  targetY?: number; // For AI
  glitchTimer?: number; // Frames frozen
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  score: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballPower: number; 
  ballSpeedMult: number; 
  enemySpeedMult: number; 
  vampirism: number;
  shield: number; 
  maxShield: number; 
  magnetism: number; 
  timeDilation: boolean; 
  glitchChance: number; 
  weaponLevel: number; // 0: None, 1: Basic, 2: Twin, 3: Omega
  shootCooldown: number;
  currentCooldown: number;
}

export interface EnemyStats {
  name: string;
  hp: number;
  maxHp: number;
  paddleHeight: number;
  paddleSpeed: number;
  reactionDelay: number; 
  errorMargin: number; 
  color: string;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  apply: (stats: PlayerStats) => PlayerStats;
}

export interface GameContext {
  level: number;
  player: PlayerStats;
  enemy: EnemyStats;
}

// FPS & Side-Scroller Specific
export interface FPSEnemy {
  x: number;
  y: number;
  hp: number;
  color: string;
  dead: boolean;
}

export interface PlatformEnemy extends Entity {
  velX: number;
  hp: number;
  dead: boolean;
}