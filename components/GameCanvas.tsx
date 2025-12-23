import React, { useRef, useEffect, useState } from 'react';
import { GameContext, Paddle, Ball, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, BALL_SIZE, INITIAL_BALL_SPEED } from '../constants';
import { updateGame, updateParticles, createParticle } from '../engine';

interface GameCanvasProps {
  context: GameContext;
  currentEnemyHp: number;
  onPlayerScore: () => void;
  onEnemyScore: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ context, currentEnemyHp, onPlayerScore, onEnemyScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (Mutable for loop performance)
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
  });

  const ballRef = useRef<Ball>({
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: INITIAL_BALL_SPEED, y: 0 }, // Start towards enemy
    width: BALL_SIZE,
    height: BALL_SIZE,
    color: '#ffffff',
    speed: INITIAL_BALL_SPEED,
    active: true,
  });

  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef<number>(0);
  
  // Input State
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<number | null>(null);

  // Sync props to refs when level changes
  useEffect(() => {
    playerRef.current.height = context.player.paddleHeight;
    playerRef.current.speed = context.player.paddleSpeed;
    
    enemyRef.current.height = context.enemy.paddleHeight;
    enemyRef.current.speed = context.enemy.paddleSpeed;
    enemyRef.current.color = context.enemy.color;
    
    // Reset positions on new level? Optional, but safer
    // playerRef.current.pos.y = CANVAS_HEIGHT / 2 - context.player.paddleHeight/2;
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
    const handleTouchMove = (e: TouchEvent) => {
       const rect = canvas.getBoundingClientRect();
       const scaleY = CANVAS_HEIGHT / rect.height;
       mousePos.current = (e.touches[0].clientY - rect.top) * scaleY;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Use window for mouse move to capture exit
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Main Loop
    const animate = () => {
      // 1. Calculate Input
      let inputY = 0;
      if (keysPressed.current['ArrowUp'] || keysPressed.current['w']) inputY = -1;
      if (keysPressed.current['ArrowDown'] || keysPressed.current['s']) inputY = 1;

      // 2. Update Physics
      const updateResult = updateGame(
        playerRef.current,
        enemyRef.current,
        ballRef.current,
        context,
        inputY,
        mousePos.current
      );

      playerRef.current = updateResult.player;
      enemyRef.current = updateResult.enemy;
      ballRef.current = updateResult.ball;
      
      // Merge particles
      particlesRef.current = [...updateParticles(particlesRef.current), ...updateResult.particles];

      // Handle Events
      if (updateResult.event === 'score_player') {
        screenShakeRef.current = 10;
        onPlayerScore();
        // Reset mouse pos to prevent jumping if mouse left canvas
        mousePos.current = null; 
      } else if (updateResult.event === 'score_enemy') {
        screenShakeRef.current = 10;
        onEnemyScore();
        mousePos.current = null;
      } else if (updateResult.event === 'hit_player' || updateResult.event === 'hit_enemy') {
        screenShakeRef.current = 3;
      } else if (updateResult.event === 'wall') {
        screenShakeRef.current = 1;
      }

      // Decrease Screen Shake
      if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;
      if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;

      // 3. Render
      
      // Clear Screen
      ctx.fillStyle = '#09090b'; // Zinc-950
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid Background
      ctx.strokeStyle = '#18181b'; // Zinc-900
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0; i<CANVAS_WIDTH; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i,CANVAS_HEIGHT); }
      for(let i=0; i<CANVAS_HEIGHT; i+=40) { ctx.moveTo(0,i); ctx.lineTo(CANVAS_WIDTH,i); }
      ctx.stroke();

      // Midline
      ctx.setLineDash([10, 15]);
      ctx.strokeStyle = '#27272a'; // Zinc-800
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH/2, 0);
      ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Apply Shake
      ctx.save();
      if (screenShakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
      }

      // Draw Paddles
      const drawEntity = (e: Paddle | Ball) => {
        ctx.fillStyle = e.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = e.color;
        ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
        ctx.shadowBlur = 0;
      };

      drawEntity(playerRef.current);
      drawEntity(enemyRef.current);
      drawEntity(ballRef.current);

      // Draw Particles
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
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [context, onPlayerScore, onEnemyScore]); // Dependencies for recreating loop if context functions change

  return (
    <div className="relative w-full h-full cursor-none">
       {/* HUD */}
       <div className="absolute top-4 left-0 right-0 flex justify-between px-12 pointer-events-none z-10 font-mono text-2xl font-bold">
          <div className="flex flex-col items-center">
             <div className="text-cyan-400">PLAYER</div>
             <div className="flex gap-1 mt-1">
               {Array.from({length: Math.max(0, context.player.hp)}).map((_, i) => (
                  <div key={i} className="w-4 h-6 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
               ))}
             </div>
          </div>
          
          <div className="text-zinc-600 text-sm mt-2">LEVEL {context.level}</div>

          <div className="flex flex-col items-center">
             <div style={{color: context.enemy.color}}>{context.enemy.name}</div>
             <div className="flex gap-1 mt-1">
               {Array.from({length: Math.max(0, currentEnemyHp)}).map((_, i) => (
                  <div key={i} className="w-4 h-6 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: context.enemy.color }} />
               ))}
             </div>
          </div>
       </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default GameCanvas;
