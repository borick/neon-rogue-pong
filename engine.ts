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
      size: Math.random() * 5 + 2,
    });
  }
  return particles;
};

export const updateParticles = (particles: Particle[]): Particle[] => {
  return particles
    .map(p => ({
      ...p,
      pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y },
      life: p.life - 0.025,
      vel: { x: p.vel.x * 0.94, y: p.vel.y * 0.94 }
    }))
    .filter(p => p.life > 0);
};

const resetBall = (ball: Ball, direction: number, ballSpeedMult: number): Ball => {
  const speed = INITIAL_BALL_SPEED * ballSpeedMult;
  return {
    ...ball,
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: direction * speed, y: (Math.random() - 0.5) * 4 },
    speed: speed,
    active: true,
  };
};

const rectIntersect = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
  return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
};

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
  player: Paddle, 
  enemy: Paddle, 
  ball: Ball, 
  projectiles: Projectile[],
  particles: Particle[], 
  event: 'none' | 'score_player' | 'score_enemy' | 'hit_player' | 'hit_enemy' | 'wall' | 'proj_hit' | 'shoot'
} => {
  let newEvent: 'none' | 'score_player' | 'score_enemy' | 'hit_player' | 'hit_enemy' | 'wall' | 'proj_hit' | 'shoot' = 'none';
  let newParticles: Particle[] = [];
  let nextProjectiles = [...projectiles];

  let dt = 1.0;
  if (context.player.timeDilation && ball.pos.x < CANVAS_WIDTH / 3 && ball.vel.x < 0) {
    dt = 0.55; 
  }

  // Player Paddle
  let nextPlayerY = playerPaddle.pos.y;
  if (mouseY !== null) {
     nextPlayerY = mouseY - playerPaddle.height / 2;
  } else {
     nextPlayerY += inputY * playerPaddle.speed;
  }
  nextPlayerY = Math.max(0, Math.min(CANVAS_HEIGHT - playerPaddle.height, nextPlayerY));
  const newPlayer: Paddle = { ...playerPaddle, pos: { ...playerPaddle.pos, y: nextPlayerY } };

  // Shooting Logic
  if (wantsToShoot && context.player.weaponLevel > 0 && context.player.currentCooldown <= 0) {
    newEvent = 'shoot';
    const pColor = context.player.weaponLevel === 3 ? '#f472b6' : '#22d3ee';
    const pSize = context.player.weaponLevel === 3 ? 15 : 8;
    const pDamage = context.player.weaponLevel === 3 ? 2 : 1;
    
    if (context.player.weaponLevel === 1) {
      nextProjectiles.push({
        id: Math.random(), pos: { x: playerPaddle.pos.x + playerPaddle.width, y: playerPaddle.pos.y + playerPaddle.height/2 },
        vel: { x: 15, y: 0 }, width: pSize, height: pSize/2, color: pColor, active: true, damage: pDamage
      });
    } else if (context.player.weaponLevel === 2) {
      nextProjectiles.push({
        id: Math.random(), pos: { x: playerPaddle.pos.x + playerPaddle.width, y: playerPaddle.pos.y + 10 },
        vel: { x: 18, y: 0 }, width: pSize, height: pSize/2, color: pColor, active: true, damage: pDamage
      });
      nextProjectiles.push({
        id: Math.random(), pos: { x: playerPaddle.pos.x + playerPaddle.width, y: playerPaddle.pos.y + playerPaddle.height - 10 },
        vel: { x: 18, y: 0 }, width: pSize, height: pSize/2, color: pColor, active: true, damage: pDamage
      });
    } else if (context.player.weaponLevel === 3) {
      nextProjectiles.push({
        id: Math.random(), pos: { x: playerPaddle.pos.x + playerPaddle.width, y: playerPaddle.pos.y + playerPaddle.height/2 - 10 },
        vel: { x: 25, y: 0 }, width: 40, height: 20, color: pColor, active: true, damage: 3
      });
    }
  }

  // Update Projectiles
  nextProjectiles = nextProjectiles.map(p => ({
    ...p, pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y }
  })).filter(p => p.pos.x < CANVAS_WIDTH && p.active);

  // Enemy Paddle
  let nextEnemyY = enemyPaddle.pos.y;
  const glitchActive = (enemyPaddle.glitchTimer || 0) > 0;
  if (!glitchActive) {
    let enemyTargetY = enemyPaddle.targetY ?? CANVAS_HEIGHT / 2;
    const effectiveEnemySpeed = enemyPaddle.speed * context.player.enemySpeedMult;
    if (ball.vel.x > 0) {
      const noise = (Math.sin(Date.now() * 0.005) * context.enemy.errorMargin);
      enemyTargetY = ball.pos.y - enemyPaddle.height / 2 + noise;
    } else {
      enemyTargetY = CANVAS_HEIGHT / 2 - enemyPaddle.height / 2;
    }
    const dy = enemyTargetY - enemyPaddle.pos.y;
    if (Math.abs(dy) > effectiveEnemySpeed) {
      nextEnemyY += Math.sign(dy) * effectiveEnemySpeed;
    } else {
      nextEnemyY = enemyTargetY;
    }
  }
  nextEnemyY = Math.max(0, Math.min(CANVAS_HEIGHT - enemyPaddle.height, nextEnemyY));
  const newEnemy: Paddle = { 
    ...enemyPaddle, 
    pos: { ...enemyPaddle.pos, y: nextEnemyY },
    glitchTimer: Math.max(0, (enemyPaddle.glitchTimer || 0) - 1)
  };

  // Projectile Collision
  nextProjectiles.forEach(p => {
    if (p.active && rectIntersect(
      { x: p.pos.x, y: p.pos.y, w: p.width, h: p.height },
      { x: newEnemy.pos.x, y: newEnemy.pos.y, w: newEnemy.width, h: newEnemy.height }
    )) {
      p.active = false;
      newEvent = 'proj_hit';
      newEnemy.glitchTimer = 10;
      newParticles = createParticle(p.pos.x, p.pos.y + p.height/2, p.color, 15);
    }
  });

  // Ball
  let nextBall = { ...ball };
  if (context.player.magnetism > 0 && ball.vel.x < 0) {
    const centerPlayer = newPlayer.pos.y + newPlayer.height / 2;
    const centerBall = nextBall.pos.y + nextBall.height / 2;
    const dy = centerPlayer - centerBall;
    const distFactor = Math.max(0, (CANVAS_WIDTH / 2 - ball.pos.x) / (CANVAS_WIDTH / 2));
    nextBall.vel.y += dy * context.player.magnetism * 0.015 * distFactor;
  }
  nextBall.pos.x += nextBall.vel.x * dt;
  nextBall.pos.y += nextBall.vel.y * dt;

  if (nextBall.pos.y <= 0 || nextBall.pos.y + nextBall.height >= CANVAS_HEIGHT) {
    nextBall.vel.y *= -1.05;
    nextBall.pos.y = nextBall.pos.y <= 0 ? 0 : CANVAS_HEIGHT - nextBall.height;
    if (newEvent === 'none') newEvent = 'wall';
  }

  const checkPaddleHit = (paddle: Paddle, isPlayer: boolean) => {
    if (rectIntersect(
      { x: nextBall.pos.x, y: nextBall.pos.y, w: nextBall.width, h: nextBall.height },
      { x: paddle.pos.x, y: paddle.pos.y, w: paddle.width, h: paddle.height }
    )) {
      nextBall.vel.x *= -1;
      const power = isPlayer ? context.player.ballPower : 1.05;
      nextBall.speed = Math.min(MAX_BALL_SPEED * context.player.ballSpeedMult, nextBall.speed * power);
      const centerPaddle = paddle.pos.y + paddle.height / 2;
      const centerBall = nextBall.pos.y + nextBall.height / 2;
      const relativeIntersectY = (centerPaddle - centerBall) / (paddle.height / 2);
      const bounceAngle = relativeIntersectY * (Math.PI / 4);
      const direction = isPlayer ? 1 : -1;
      nextBall.vel.x = direction * nextBall.speed * Math.cos(bounceAngle);
      nextBall.vel.y = nextBall.speed * -Math.sin(bounceAngle);
      if (isPlayer) nextBall.pos.x = paddle.pos.x + paddle.width + 1;
      else nextBall.pos.x = paddle.pos.x - nextBall.width - 1;
      newEvent = isPlayer ? 'hit_player' : 'hit_enemy';
      newParticles = createParticle(isPlayer ? nextBall.pos.x : nextBall.pos.x + nextBall.width, nextBall.pos.y + nextBall.height / 2, isPlayer ? '#22d3ee' : context.enemy.color, 25);
    }
  };

  checkPaddleHit(newPlayer, true);
  checkPaddleHit(newEnemy, false);

  if (nextBall.pos.x < 0) {
    newEvent = 'score_enemy';
    nextBall = resetBall(ball, 1, context.player.ballSpeedMult);
  } else if (nextBall.pos.x > CANVAS_WIDTH) {
    newEvent = 'score_player';
    nextBall = resetBall(ball, -1, context.player.ballSpeedMult);
  }

  return { player: newPlayer, enemy: newEnemy, ball: nextBall, projectiles: nextProjectiles, particles: newParticles, event: newEvent };
};