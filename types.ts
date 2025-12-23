export type GameStatePhase = 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER' | 'VICTORY';

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

export interface Ball extends Entity {
  vel: Vector;
  speed: number;
  active: boolean;
}

export interface Paddle extends Entity {
  speed: number;
  targetY?: number; // For AI
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  score: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballPower: number; // Increases ball speed on hit
}

export interface EnemyStats {
  name: string;
  hp: number;
  maxHp: number;
  paddleHeight: number;
  paddleSpeed: number;
  reactionDelay: number; // Frames to wait before updating target
  errorMargin: number; // Random offset in tracking
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
