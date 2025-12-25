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
  isPaused?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ context, currentEnemyHp, onPlayerScore, onEnemyScore, onProjectileHit, isPaused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const playerRef = useRef<Paddle>({
    pos: { x: 50, y: CANVAS_HEIGHT / 2 - context.player.paddleHeight / 2 },
    width: PADDLE_WIDTH,
    height: context.player.paddleHeight,
    color: '#22d3ee',
    speed: context.player.paddleSpeed,
  });
  
  const enemyRef = useRef<Paddle>({
    pos: { x: CANVAS_WIDTH - 50 - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - context.enemy.paddleHeight / 2 },
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
  const ballTrailRef = useRef<{x: number, y: number}[]>([]);
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

    const animate = (time: number) => {
      const delta = time - lastTimeRef.current;
      const targetFrameTime = 1000 / 60;

      if (delta < targetFrameTime) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimeRef.current = time - (delta % targetFrameTime);

      if (isPaused) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

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
      if (ballTrailRef.current.length > 12) ballTrailRef.current.pop();

      if (updateResult.event !== 'none') {
        if (updateResult.event === 'shoot') {
          SoundSystem.playShoot(context.player.weaponLevel);
          context.player.currentCooldown = context.player.shootCooldown;
        } else if (updateResult.event === 'proj_hit') {
          SoundSystem.playProjectileHit();
          onProjectileHit();
          screenShakeRef.current = 10;
        } else if (updateResult.event.startsWith('hit')) {
          hitStopRef.current = 3;
          screenShakeRef.current = 6;
          updateResult.event === 'hit_player' ? SoundSystem.playPlayerHit() : SoundSystem.playEnemyHit();
        } else if (updateResult.event.startsWith('score')) {
          hitStopRef.current = 12;
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

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = '#ffffff08';
      ctx.lineWidth = 1;
      const bX = ballRef.current.pos.x;
      const bY = ballRef.current.pos.y;
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.quadraticCurveTo(bX, bY, i, CANVAS_HEIGHT); ctx.stroke();
      }

      if (context.player.timeDilation && ballRef.current.pos.x < CANVAS_WIDTH / 4) {
        const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH / 4, 0);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH / 4, CANVAS_HEIGHT);
      }

      ctx.save();
      if (screenShakeRef.current > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShakeRef.current, (Math.random() - 0.5) * screenShakeRef.current);
      }

      ballTrailRef.current.forEach((pos, i) => {
        const alpha = (1 - i / ballTrailRef.current.length) * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(pos.x, pos.y, BALL_SIZE, BALL_SIZE);
      });

      const drawEntity = (e: Paddle | Ball | Projectile, isEnemy: boolean = false) => {
        const isGlitch = isEnemy && (enemyRef.current.glitchTimer || 0) > 0;
        ctx.fillStyle = isGlitch ? '#ff0000' : e.color;
        ctx.shadowBlur = isGlitch ? 40 : 15;
        ctx.shadowColor = e.color;
        
        if (isGlitch && Math.random() > 0.4) {
           ctx.fillRect(e.pos.x + (Math.random()-0.5)*20, e.pos.y, e.width, e.height);
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
  }, [context, onEnemyScore, onPlayerScore, onProjectileHit, isPaused]);

  return (
    <div className="relative w-full h-full cursor-none">
       <div className="absolute top-6 left-0 right-0 flex justify-between px-16 pointer-events-none z-10 font-mono">
          <div className="flex flex-col items-start gap-1">
             <div className="text-cyan-400 text-[10px] opacity-70 uppercase tracking-widest font-bold">SYSTEM_INTEGRITY</div>
             <div className="flex gap-1.5 items-end">
               {Array.from({length: context.player.maxHp}).map((_, i) => (
                  <div key={i} className={`w-4 h-8 border border-cyan-500/50 ${i < context.player.hp ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'bg-transparent opacity-20'}`} />
               ))}
               {Array.from({length: context.player.maxShield}).map((_, i) => (
                  <div key={'s'+i} className={`w-5 h-10 border-2 border-indigo-400/50 ${i < context.player.shield ? 'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,1)] animate-pulse' : 'bg-transparent opacity-20'}`} />
               ))}
             </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-zinc-500 text-[9px] tracking-[0.6em] uppercase font-bold">Sector_{context.level}</div>
            <div className={`text-xs mt-1 font-mono font-bold tracking-widest ${context.player.weaponLevel > 0 ? 'text-amber-400' : 'text-zinc-700'}`}>
              {context.player.weaponLevel === 0 && 'WEAPONS_LOCKED'}
              {context.player.weaponLevel === 1 && 'PULSE_BLASTER_ONLINE'}
              {context.player.weaponLevel === 2 && 'TWIN_RAILGUNS_READY'}
              {context.player.weaponLevel === 3 && 'SINGULARITY_BEAM_ACTIVE'}
            </div>
            {context.player.weaponLevel > 0 && (
                <div className="w-48 h-1 bg-zinc-800 mt-2 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-cyan-400 transition-all duration-100" 
                        style={{ width: `${100 - (context.player.currentCooldown / context.player.shootCooldown) * 100}%` }} 
                    />
                </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
             <div style={{color: context.enemy.color}} className="text-[10px] opacity-70 uppercase tracking-widest font-bold">{context.enemy.name}</div>
             <div className="flex gap-1.5">
               {Array.from({length: Math.max(0, currentEnemyHp)}).map((_, i) => (
                  <div key={i} className="w-4 h-8 shadow-[0_0_15px_currentColor]" style={{ backgroundColor: context.enemy.color }} />
               ))}
             </div>
          </div>
       </div>

       <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none opacity-40 font-mono text-[9px] tracking-[0.8em] text-zinc-500 animate-pulse">
         [ HOLD SPACEBAR OR MOUSE_ONE TO TRIGGER AUGMENTS ]
       </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
    </div>
  );
};

export default GameCanvas;