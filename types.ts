export type GameStatePhase = 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER' | 'VICTORY' | 'FPS_HUNT' | 'SPACE_SHOOTER' | 'SIDE_SCROLLER' | 'MATRIX_BREACH' | 'SURVIVOR_MINIGAME' | 'CELEBRATION';

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
  glow?: boolean;
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
  owner: 'player' | 'enemy';
}

export interface Ball extends Entity {
  vel: Vector;
  speed: number;
  active: boolean;
  trail: Vector[];
}

export interface Paddle extends Entity {
  speed: number;
  targetY?: number;
  glitchTimer?: number;
  style: 'AGGRESSIVE' | 'DEFENSIVE' | 'CALCULATING';
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  score: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballPower: number; 
  ballSpeedMult: number; 
  enemySpeedMult: number; 
  vampirism: number;
  shield: number; 
  maxShield: number; 
  weaponLevel: number; 
  shootCooldown: number;
  currentCooldown: number;
  prestige: number;
  hasArchitectKey: boolean;
  chronoTrigger: boolean; // Manual time slow
}

export interface SaveData {
  prestige: number;
  level: number;
  playerStats: PlayerStats;
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
  style: Paddle['style'];
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

export interface FPSEnemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  color: string;
  dead: boolean;
  lastShot: number;
  state: 'IDLE' | 'HUNTING' | 'FIRING';
}

export interface PlatformEnemy extends Entity {
  velX: number;
  hp: number;
  dead: boolean;
}

export interface ShooterEnemy extends Entity {
  hp: number;
  lastShot: number;
  dead: boolean;
}