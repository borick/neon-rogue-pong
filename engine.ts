
import { Ball, Paddle, Vector, Particle, GameContext, Projectile } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, BALL_SIZE, MAX_BALL_SPEED, INITIAL_BALL_SPEED } from './constants';

export const createParticle = (x: number, y: number, color: string, count: number = 10): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: Math.random(),
      pos: { x, y },
      vel: { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12 },
      life: 1.0,
      maxLife: 1.0,
      color,
      size: Math.random() * 4 + 1,
    });
  }
  return particles;
};

export const updateParticles = (particles: Particle[]): Particle[] => {
  return particles
    .map(p => ({
      ...p,
      pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y },
      life: p.life - 0.02,
      vel: { x: p.vel.x * 0.96, y: p.vel.y * 0.96 }
    }))
    .filter(p => p.life > 0);
};

const resetBall = (ball: Ball, direction: number, ballSpeedMult: number): Ball => {
  const speed = INITIAL_BALL_SPEED * ballSpeedMult;
  return {
    ...ball,
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: direction * speed, y: (Math.random() - 0.5) * 6 }, // Reduced random Y spread
    speed: speed,
    active: true,
    trail: []
  };
};

const rectIntersect = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
  return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
};

export type GameEvent = 'none' | 'score_player' | 'score_enemy' | 'hit_player' | 'hit_enemy' | 'wall' | 'proj_hit' | 'shoot';

// Fix: Explicitly defining the return type for updateGame to prevent incorrect type narrowing 
// of the 'event' field, ensuring that 'proj_hit' is correctly handled in the UI.
export const updateGame = (
  playerPaddle: Paddle,
  enemyPaddle: Paddle,
  ball: Ball,
  projectiles: Projectile[],
  context: GameContext,
  inputY: number,
  mouseY: number | null,
  wantsToShoot: boolean
): {
  player: Paddle;
  enemy: Paddle;
  ball: Ball;
  projectiles: Projectile[];
  particles: Particle[];
  event: GameEvent;
} => {
  let event: GameEvent = 'none';
  let newParticles: Particle[] = [];
  let nextProjectiles = [...projectiles];

  // Player movement
  let nextPlayerY = playerPaddle.pos.y;
  if (mouseY !== null) {
      nextPlayerY = mouseY - playerPaddle.height / 2;
  } else {
      nextPlayerY += inputY * playerPaddle.speed;
  }
  nextPlayerY = Math.max(0, Math.min(CANVAS_HEIGHT - playerPaddle.height, nextPlayerY));

  // Enemy AI Logic - significantly handicapped by reaction delay
  let nextEnemyY = enemyPaddle.pos.y;
  if (ball.vel.x > 0 && Math.random() * 100 > context.enemy.reactionDelay) {
    let targetY = ball.pos.y - enemyPaddle.height / 2;
    
    if (context.enemy.style === 'AGGRESSIVE') {
        targetY = ball.pos.y - enemyPaddle.height / 4;
    } else if (context.enemy.style === 'CALCULATING') {
        const timeToHit = (enemyPaddle.pos.x - ball.pos.x) / ball.vel.x;
        const predictedY = ball.pos.y + ball.vel.y * timeToHit;
        targetY = predictedY - enemyPaddle.height / 2;
    }

    const dy = targetY - enemyPaddle.pos.y;
    // Enemy moves slower than the ball on purpose
    // Fix: Changed 'paddleSpeed' to 'speed' to correctly reference the property on the Paddle interface.
    nextEnemyY += Math.sign(dy) * Math.min(Math.abs(dy), enemyPaddle.speed * 0.7);
  }
  nextEnemyY = Math.max(0, Math.min(CANVAS_HEIGHT - enemyPaddle.height, nextEnemyY));

  // Shooting logic
  if (wantsToShoot && context.player.currentCooldown <= 0 && context.player.weaponLevel > 0) {
    event = 'shoot';
    nextProjectiles.push({
      id: Math.random(),
      pos: { x: playerPaddle.pos.x + playerPaddle.width, y: nextPlayerY + playerPaddle.height / 2 },
      vel: { x: 15, y: 0 },
      width: 12,
      height: 5,
      color: '#22d3ee',
      active: true,
      damage: 1,
      owner: 'player'
    });
    context.player.currentCooldown = context.player.shootCooldown;
  }

  // Projectile Update
  nextProjectiles = nextProjectiles.map(p => {
    const np = { ...p, pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y } };
    if (np.owner === 'player') {
      if (rectIntersect({x: np.pos.x, y: np.pos.y, w: np.width, h: np.height}, {x: enemyPaddle.pos.x, y: nextEnemyY, w: enemyPaddle.width, h: enemyPaddle.height})) {
        np.active = false;
        event = 'proj_hit';
        newParticles = [...newParticles, ...createParticle(np.pos.x, np.pos.y, enemyPaddle.color, 5)];
      }
    }
    if (np.pos.x < 0 || np.pos.x > CANVAS_WIDTH) np.active = false;
    return np;
  }).filter(p => p.active);

  // Ball Physics
  const nextBall = { ...ball };
  nextBall.pos.x += ball.vel.x;
  nextBall.pos.y += ball.vel.y;
  nextBall.trail.unshift({ ...nextBall.pos });
  if (nextBall.trail.length > 10) nextBall.trail.pop();

  // Wall Bounce
  if (nextBall.pos.y <= 0 || nextBall.pos.y + nextBall.height >= CANVAS_HEIGHT) {
    nextBall.vel.y *= -1.0; // No speed gain on wall bounce
    nextBall.pos.y = nextBall.pos.y <= 0 ? 0 : CANVAS_HEIGHT - nextBall.height;
    event = 'wall';
  }

  // Paddle Hits
  const ballRect = { x: nextBall.pos.x, y: nextBall.pos.y, w: nextBall.width, h: nextBall.height };
  const p1Rect = { x: playerPaddle.pos.x, y: nextPlayerY, w: playerPaddle.width, h: playerPaddle.height };
  const p2Rect = { x: enemyPaddle.pos.x, y: nextEnemyY, w: enemyPaddle.width, h: enemyPaddle.height };

  if (rectIntersect(ballRect, p1Rect)) {
      nextBall.vel.x *= -1.02; // Very slow speed increase
      const rel = (nextPlayerY + playerPaddle.height/2) - (nextBall.pos.y + nextBall.height/2);
      nextBall.vel.y = -rel * 0.15;
      nextBall.pos.x = playerPaddle.pos.x + playerPaddle.width + 1;
      event = 'hit_player';
      newParticles = [...newParticles, ...createParticle(nextBall.pos.x, nextBall.pos.y, playerPaddle.color)];
  } else if (rectIntersect(ballRect, p2Rect)) {
      nextBall.vel.x *= -1.02;
      const rel = (nextEnemyY + enemyPaddle.height/2) - (nextBall.pos.y + nextBall.height/2);
      nextBall.vel.y = -rel * 0.15;
      nextBall.pos.x = enemyPaddle.pos.x - nextBall.width - 1;
      event = 'hit_enemy';
      newParticles = [...newParticles, ...createParticle(nextBall.pos.x, nextBall.pos.y, enemyPaddle.color)];
  }

  // Scoring
  let resBall = nextBall;
  if (nextBall.pos.x < 0) { 
    event = 'score_enemy'; 
    resBall = resetBall(ball, 1, context.player.ballSpeedMult); 
  } else if (nextBall.pos.x > CANVAS_WIDTH) { 
    event = 'score_player'; 
    resBall = resetBall(ball, -1, context.player.ballSpeedMult); 
  }

  // Cap speed
  const speed = Math.hypot(resBall.vel.x, resBall.vel.y);
  if (speed > MAX_BALL_SPEED) {
      const ratio = MAX_BALL_SPEED / speed;
      resBall.vel.x *= ratio;
      resBall.vel.y *= ratio;
  }

  return {
    player: { ...playerPaddle, pos: { ...playerPaddle.pos, y: nextPlayerY } },
    enemy: { ...enemyPaddle, pos: { ...enemyPaddle.pos, y: nextEnemyY } },
    ball: resBall,
    projectiles: nextProjectiles,
    particles: newParticles,
    event
  };
};
