
import React, { useRef, useEffect } from 'react';
import { GameContext, Paddle, Ball, Particle, Projectile } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, BALL_SIZE, INITIAL_BALL_SPEED } from '../constants';
import { updateGame, updateParticles, GameEvent } from '../engine';
import { SoundSystem } from '../audio';

interface GameCanvasProps {
  context: GameContext;
  currentEnemyHp: number;
  onPlayerScore: () => void;
  onEnemyScore: () => void;
  onProjectileHit: () => void;
  onSecretBreach: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ context, currentEnemyHp, onPlayerScore, onEnemyScore, onProjectileHit, onSecretBreach }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const playerRef = useRef<Paddle>({
    pos: { x: 50, y: CANVAS_HEIGHT / 2 - 40 },
    width: PADDLE_WIDTH,
    height: context.player.paddleHeight,
    color: '#22d3ee',
    speed: context.player.paddleSpeed,
    style: 'DEFENSIVE'
  });

  const enemyRef = useRef<Paddle>({
    pos: { x: CANVAS_WIDTH - 50 - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - 40 },
    width: PADDLE_WIDTH,
    height: context.enemy.paddleHeight,
    color: context.enemy.color,
    speed: context.enemy.paddleSpeed,
    style: context.enemy.style,
    glitchTimer: 0
  });

  const ballRef = useRef<Ball>({
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: INITIAL_BALL_SPEED, y: 0 }, 
    width: BALL_SIZE, height: BALL_SIZE,
    color: '#ffffff', speed: INITIAL_BALL_SPEED, active: true,
    trail: []
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<number | null>(null);

  useEffect(() => {
    playerRef.current.height = context.player.paddleHeight;
    playerRef.current.speed = context.player.paddleSpeed;
    enemyRef.current.height = context.enemy.paddleHeight;
    enemyRef.current.speed = context.enemy.paddleSpeed;
    enemyRef.current.color = context.enemy.color;
    enemyRef.current.style = context.enemy.style;
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
      mousePos.current = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      let inputY = 0;
      if (keysPressed.current['w']) inputY = -1;
      if (keysPressed.current['s']) inputY = 1;
      
      const wantsToShoot = keysPressed.current[' '];

      const res = updateGame(
        playerRef.current, enemyRef.current, ballRef.current, projectilesRef.current,
        context, inputY, mousePos.current, wantsToShoot
      );

      playerRef.current = res.player;
      enemyRef.current = res.enemy;
      ballRef.current = res.ball;
      projectilesRef.current = res.projectiles;
      particlesRef.current = [...updateParticles(particlesRef.current), ...res.particles];

      context.player.currentCooldown = Math.max(0, context.player.currentCooldown - 1);

      if (context.player.hasArchitectKey && ballRef.current.speed > 18 && 
          Math.abs(ballRef.current.pos.x - CANVAS_WIDTH/2) < 15) {
        onSecretBreach();
      }

      const proximity = 1 - (Math.abs(ballRef.current.pos.x - playerRef.current.pos.x) / CANVAS_WIDTH);
      SoundSystem.updateDrone(ballRef.current.speed, proximity);

      ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = '#10101a'; ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }

      const drawEnt = (e: any, glow: string) => {
        ctx.fillStyle = e.color || '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = glow;
        ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height); ctx.shadowBlur = 0;
      };

      projectilesRef.current.forEach(p => drawEnt(p, p.color));
      drawEnt(playerRef.current, '#22d3ee');
      drawEnt(enemyRef.current, enemyRef.current.color);
      
      // Ball Trail
      ballRef.current.trail.forEach((t, i) => {
        ctx.fillStyle = `rgba(255,255,255,${0.3 - i*0.03})`;
        ctx.fillRect(t.x, t.y, ballRef.current.width, ballRef.current.height);
      });
      drawEnt(ballRef.current, '#fff');

      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Type-safe event handling by explicitly using GameEvent
      const gameEvent: GameEvent = res.event;
      if (gameEvent !== 'none') {
        if (gameEvent === 'score_player') onPlayerScore();
        if (gameEvent === 'score_enemy') onEnemyScore();
        if (gameEvent === 'proj_hit') onProjectileHit();
        if (gameEvent === 'hit_player') SoundSystem.playPlayerHit();
        if (gameEvent === 'hit_enemy') SoundSystem.playEnemyHit();
        if (gameEvent === 'wall') SoundSystem.playWallHit();
        if (gameEvent === 'shoot') SoundSystem.playShoot(context.player.weaponLevel);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [context]);

  return (
    <div className="relative w-full h-full cursor-none">
      <div className="absolute top-4 left-0 right-0 flex justify-between px-10 pointer-events-none z-10">
        <div className="text-cyan-400 font-mono text-sm uppercase">HP_{context.player.hp} // SHIELD_{context.player.shield}</div>
        <div className="text-zinc-600 font-mono text-xs uppercase tracking-widest">{context.enemy.name} HP: {currentEnemyHp}</div>
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />
    </div>
  );
};
export default GameCanvas;
