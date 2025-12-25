import React, { useRef, useEffect, useState } from 'react';
import { GameContext, Paddle, Ball, Particle, Projectile } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, BALL_SIZE, INITIAL_BALL_SPEED } from '../constants';
import { updateGame, updateParticles, createParticle } from '../engine';
import { SoundSystem } from '../audio';

interface GameCanvasProps {
  context: GameContext;
  currentEnemyHp: number;
  onPlayerScore: () => void;
  onEnemyScore: () => void;
  onProjectileHit: () => void;
}

interface BallPos {
  x: number;
  y: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ context, currentEnemyHp, onPlayerScore, onEnemyScore, onProjectileHit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const playerRef = useRef<Paddle>({
    pos: { x: 50, y: CANVAS_HEIGHT / 2 - 40 },
    width: PADDLE_WIDTH,
    height: context.player.paddleHeight,
    color: '#22d3ee',
    speed: context.player.paddleSpeed,
  });

  const enemyRef = useRef<Paddle>({
    pos: { x: CANVAS_WIDTH - 50 - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - 40 },
    width: PADDLE_WIDTH,
    height: context.enemy.paddleHeight,
    color: context.enemy.color,
    speed: context.enemy.paddleSpeed,
    targetY: CANVAS_HEIGHT / 2,
    glitchTimer: 0
  });

  const ballRef = useRef<Ball>({
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: INITIAL_BALL_SPEED, y: 0 }, 
    width: BALL_SIZE,
    height: BALL_SIZE,
    color: '#ffffff',
    speed: INITIAL_BALL_SPEED,
    active: true,
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef<number>(0);
  const hitStopRef = useRef<number>(0);
  const ballTrailRef = useRef<BallPos[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<number | null>(null);
  const isMouseDown = useRef(false);

  useEffect(() => {
    playerRef.current.height = context.player.paddleHeight;
    playerRef.current.speed = context.player.paddleSpeed;
    enemyRef.current.height = context.enemy.paddleHeight;
    enemyRef.current.speed = context.enemy.paddleSpeed;
    enemyRef.current.color = context.enemy.color;
  }, [context]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleY = CANVAS_HEIGHT / rect.height;
      mousePos.current = (e.clientY - rect.top) * scaleY;
    };
    const handleMouseDown = () => { isMouseDown.current = true; };
    const handleMouseUp = () => { isMouseDown.current = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      if (hitStopRef.current > 0) {
        hitStopRef.current--;
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      let inputY = 0;
      if (keysPressed.current['ArrowUp'] || keysPressed.current['w']) inputY = -1;
      if (keysPressed.current['ArrowDown'] || keysPressed.current['s']) inputY = 1;
      
      const wantsToShoot = keysPressed.current[' '] || isMouseDown.current;

      const updateResult = updateGame(
        playerRef.current, enemyRef.current, ballRef.current, projectilesRef.current,
        context, inputY, mousePos.current, wantsToShoot
      );

      playerRef.current = updateResult.player;
      enemyRef.current = updateResult.enemy;
      ballRef.current = updateResult.ball;
      projectilesRef.current = updateResult.projectiles;
      particlesRef.current = [...updateParticles(particlesRef.current), ...updateResult.particles];

      context.player.currentCooldown = Math.max(0, context.player.currentCooldown - 1);

      SoundSystem.updateDrone(ballRef.current.speed);

      ballTrailRef.current.unshift({ x: ballRef.current.pos.x, y: ballRef.current.pos.y });
      if (ballTrailRef.current.length > 8) ballTrailRef.current.pop();

      if (updateResult.event !== 'none') {
        if (updateResult.event === 'shoot') {
          SoundSystem.playShoot(context.player.weaponLevel);
          context.player.currentCooldown = context.player.shootCooldown;
        } else if (updateResult.event === 'proj_hit') {
          SoundSystem.playProjectileHit();
          onProjectileHit();
          screenShakeRef.current = 5;
        } else if (updateResult.event.startsWith('hit')) {
          hitStopRef.current = 4;
          screenShakeRef.current = 8;
          updateResult.event === 'hit_player' ? SoundSystem.playPlayerHit() : SoundSystem.playEnemyHit();
        } else if (updateResult.event.startsWith('score')) {
          hitStopRef.current = 10;
          screenShakeRef.current = 15;
          updateResult.event === 'score_player' ? SoundSystem.playScorePlayer() : SoundSystem.playScoreEnemy();
          onPlayerScore(); 
          if (updateResult.event === 'score_enemy') onEnemyScore();
          ballTrailRef.current = [];
        } else if (updateResult.event === 'wall') {
          screenShakeRef.current = 2;
          SoundSystem.playWallHit();
        }
      }

      if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;

      ctx.fillStyle = '#050507'; 
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = '#10101a';
      ctx.lineWidth = 1;
      const ballX = ballRef.current.pos.x;
      const ballY = ballRef.current.pos.y;
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.quadraticCurveTo(ballX, ballY, i, CANVAS_HEIGHT); ctx.stroke();
      }

      if (context.player.timeDilation && ballRef.current.pos.x < CANVAS_WIDTH / 3) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      ctx.save();
      if (screenShakeRef.current > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShakeRef.current, (Math.random() - 0.5) * screenShakeRef.current);
      }

      ballTrailRef.current.forEach((pos, i) => {
        const alpha = (1 - i / ballTrailRef.current.length) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(pos.x, pos.y, BALL_SIZE, BALL_SIZE);
      });

      const drawEntity = (e: Paddle | Ball | Projectile, isEnemy: boolean = false) => {
        const isGlitch = isEnemy && (enemyRef.current.glitchTimer || 0) > 0;
        ctx.fillStyle = isGlitch ? '#fff' : e.color;
        ctx.shadowBlur = isGlitch ? 40 : 15;
        ctx.shadowColor = e.color;
        if (isGlitch && Math.random() > 0.5) {
           ctx.fillRect(e.pos.x + (Math.random()-0.5)*15, e.pos.y, e.width, e.height);
        } else {
           ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
        }
        ctx.shadowBlur = 0;
      };

      projectilesRef.current.forEach(p => drawEntity(p));
      drawEntity(playerRef.current);
      drawEntity(enemyRef.current, true);
      drawEntity(ballRef.current);

      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      ctx.restore();
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [context]);

  return (
    <div className="relative w-full h-full cursor-none">
       <div className="absolute top-4 left-0 right-0 flex justify-between px-12 pointer-events-none z-10 font-mono text-2xl font-bold">
          <div className="flex flex-col items-center">
             <div className="text-cyan-400 text-sm opacity-50 uppercase">User_Stats</div>
             <div className="flex gap-1 mt-1">
               {Array.from({length: context.player.hp}).map((_, i) => (
                  <div key={i} className="w-4 h-6 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] border border-white/20" />
               ))}
               {Array.from({length: context.player.shield}).map((_, i) => (
                  <div key={'s'+i} className="w-5 h-7 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.9)] border-2 border-white/50 animate-pulse" />
               ))}
             </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-zinc-600 text-[10px] tracking-[0.5em] uppercase">Weapon_Status</div>
            <div className={`text-xs mt-1 font-mono ${context.player.weaponLevel > 0 ? 'text-amber-400' : 'text-zinc-700'}`}>
              {context.player.weaponLevel === 0 && 'OFFLINE'}
              {context.player.weaponLevel === 1 && 'PULSE_BLASTER'}
              {context.player.weaponLevel === 2 && 'TWIN_RAILGUNS'}
              {context.player.weaponLevel === 3 && 'OMEGA_BEAM'}
            </div>
          </div>
          <div className="flex flex-col items-center">
             <div style={{color: context.enemy.color}} className="text-sm opacity-50 uppercase">{context.enemy.name}</div>
             <div className="flex gap-1 mt-1">
               {Array.from({length: Math.max(0, currentEnemyHp)}).map((_, i) => (
                  <div key={i} className="w-4 h-6 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: context.enemy.color }} />
               ))}
             </div>
          </div>
       </div>
       <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-20 font-mono text-[10px] tracking-widest text-zinc-500">
         [ HOLD SPACEBAR OR TAP TO FIRE WEAPONS ]
       </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
    </div>
  );
};
export default GameCanvas;