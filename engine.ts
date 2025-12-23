import { Ball, Paddle, Vector, Particle, GameContext } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, BALL_SIZE, MAX_BALL_SPEED, INITIAL_BALL_SPEED } from './constants';

// --- Particle System ---
export const createParticle = (x: number, y: number, color: string, count: number = 10): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: Math.random(),
      pos: { x, y },
      vel: { 
        x: (Math.random() - 0.5) * 10, 
        y: (Math.random() - 0.5) * 10 
      },
      life: 1.0,
      maxLife: 1.0,
      color,
      size: Math.random() * 4 + 2,
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
      vel: { x: p.vel.x * 0.95, y: p.vel.y * 0.95 } // Friction
    }))
    .filter(p => p.life > 0);
};

// --- Physics & Collision ---
const resetBall = (ball: Ball, direction: number): Ball => {
  return {
    ...ball,
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: direction * INITIAL_BALL_SPEED, y: 0 },
    speed: INITIAL_BALL_SPEED,
    active: true,
  };
};

// AABB Collision
const rectIntersect = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
  return !(r2.x > r1.x + r1.w || 
           r2.x + r2.w < r1.x || 
           r2.y > r1.y + r1.h || 
           r2.y + r2.h < r1.y);
};

export const updateGame = (
  playerPaddle: Paddle,
  enemyPaddle: Paddle,
  ball: Ball,
  context: GameContext,
  inputY: number, // -1 (up), 0, 1 (down)
  mouseY: number | null
): { 
  player: Paddle, 
  enemy: Paddle, 
  ball: Ball, 
  particles: Particle[], 
  event: 'none' | 'score_player' | 'score_enemy' | 'hit_player' | 'hit_enemy' | 'wall' 
} => {
  
  let newEvent: 'none' | 'score_player' | 'score_enemy' | 'hit_player' | 'hit_enemy' | 'wall' = 'none';
  let newParticles: Particle[] = [];

  // --- Player Movement ---
  // If mouse is used, follow mouse. Otherwise use keys.
  let nextPlayerY = playerPaddle.pos.y;
  if (mouseY !== null) {
     nextPlayerY = mouseY - playerPaddle.height / 2;
  } else {
     nextPlayerY += inputY * playerPaddle.speed;
  }
  
  // Clamp Player
  nextPlayerY = Math.max(0, Math.min(CANVAS_HEIGHT - playerPaddle.height, nextPlayerY));

  const newPlayer: Paddle = { ...playerPaddle, pos: { ...playerPaddle.pos, y: nextPlayerY } };

  // --- Enemy AI Movement ---
  // Simple AI with reaction delay logic would go here, 
  // but for stateless pure function, we assume target is passed or calculated simply.
  // We'll calculate a simple "desired Y" here based on ball position.
  
  let enemyTargetY = enemyPaddle.targetY ?? CANVAS_HEIGHT / 2;
  
  // Only track if ball is coming towards enemy
  if (ball.vel.x > 0) {
    // Add some noise based on errorMargin
    const noise = (Math.sin(Date.now() * 0.005) * context.enemy.errorMargin);
    enemyTargetY = ball.pos.y - enemyPaddle.height / 2 + noise;
  } else {
    // Return to center if ball moving away
    enemyTargetY = CANVAS_HEIGHT / 2 - enemyPaddle.height / 2;
  }

  // Move enemy towards target
  let nextEnemyY = enemyPaddle.pos.y;
  const dy = enemyTargetY - enemyPaddle.pos.y;
  if (Math.abs(dy) > enemyPaddle.speed) {
    nextEnemyY += Math.sign(dy) * enemyPaddle.speed;
  } else {
    nextEnemyY = enemyTargetY;
  }
  
  // Clamp Enemy
  nextEnemyY = Math.max(0, Math.min(CANVAS_HEIGHT - enemyPaddle.height, nextEnemyY));
  
  const newEnemy: Paddle = { 
    ...enemyPaddle, 
    pos: { ...enemyPaddle.pos, y: nextEnemyY },
    targetY: enemyTargetY 
  };


  // --- Ball Movement ---
  let nextBall = { ...ball };
  nextBall.pos.x += nextBall.vel.x;
  nextBall.pos.y += nextBall.vel.y;

  // Wall Collision (Top/Bottom)
  if (nextBall.pos.y <= 0 || nextBall.pos.y + nextBall.height >= CANVAS_HEIGHT) {
    nextBall.vel.y *= -1;
    // Push out of wall
    nextBall.pos.y = nextBall.pos.y <= 0 ? 0 : CANVAS_HEIGHT - nextBall.height;
    newEvent = 'wall';
  }

  // Paddle Collision Helper
  const checkPaddleHit = (paddle: Paddle, isPlayer: boolean) => {
    if (rectIntersect(
      { x: nextBall.pos.x, y: nextBall.pos.y, w: nextBall.width, h: nextBall.height },
      { x: paddle.pos.x, y: paddle.pos.y, w: paddle.width, h: paddle.height }
    )) {
      // Hit!
      // Reverse X
      nextBall.vel.x *= -1;
      
      // Add speed
      const power = isPlayer ? context.player.ballPower : 1.05;
      nextBall.speed = Math.min(MAX_BALL_SPEED, nextBall.speed * power);
      
      // Adjust angle based on where it hit the paddle
      const centerPaddle = paddle.pos.y + paddle.height / 2;
      const centerBall = nextBall.pos.y + nextBall.height / 2;
      const relativeIntersectY = (centerPaddle - centerBall) / (paddle.height / 2);
      const bounceAngle = relativeIntersectY * (Math.PI / 4); // Max 45 degree angle

      const direction = isPlayer ? 1 : -1;
      nextBall.vel.x = direction * nextBall.speed * Math.cos(bounceAngle);
      nextBall.vel.y = nextBall.speed * -Math.sin(bounceAngle);

      // Push ball out of paddle to prevent sticking
      if (isPlayer) {
          nextBall.pos.x = paddle.pos.x + paddle.width + 1;
      } else {
          nextBall.pos.x = paddle.pos.x - nextBall.width - 1;
      }

      newEvent = isPlayer ? 'hit_player' : 'hit_enemy';
      newParticles = createParticle(
        isPlayer ? nextBall.pos.x : nextBall.pos.x + nextBall.width, 
        nextBall.pos.y + nextBall.height / 2, 
        isPlayer ? '#22d3ee' : context.enemy.color
      );
    }
  };

  checkPaddleHit(newPlayer, true);
  checkPaddleHit(newEnemy, false);

  // Score Conditions
  if (nextBall.pos.x < 0) {
    // Enemy Scores
    newEvent = 'score_enemy';
    nextBall = resetBall(ball, 1); // Reset towards player
  } else if (nextBall.pos.x > CANVAS_WIDTH) {
    // Player Scores
    newEvent = 'score_player';
    nextBall = resetBall(ball, -1); // Reset towards enemy
  }

  return {
    player: newPlayer,
    enemy: newEnemy,
    ball: nextBall,
    particles: newParticles,
    event: newEvent
  };
};
