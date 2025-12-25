
import React, { useRef, useEffect } from 'react';
import { PlayerStats, Projectile, PlatformEnemy } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { SoundSystem } from '../audio';
import { Button } from './Button';

interface SideScrollerProps {
  playerStats: PlayerStats;
  onVictory: () => void;
  onExit: () => void;
  isPaused?: boolean;
}

const GRAVITY = 0.65;
const JUMP_FORCE = -14;
const WALK_SPEED = 6;

const PLATFORMS = [
  { x: 0, y: 540, w: 500, h: 60 },
  { x: 600, y: 460, w: 250, h: 20 },
  { x: 900, y: 380, w: 350, h: 20 },
  { x: 1350, y: 320, w: 450, h: 20 },
  { x: 1900, y: 440, w: 350, h: 20 },
  { x: 2300, y: 500, w: 800, h: 100 },
];
const GOAL_X = 2800;

const SideScrollerCanvas: React.FC<SideScrollerProps> = ({ playerStats, onVictory, onExit, isPaused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fixed: Added initial value 0 to satisfy useRef<number> requirement
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const state = useRef({
    player: {
      x: 100, y: 400, velX: 0, velY: 0, 
      width: 25, height: 60,
      grounded: false
    },
    cameraX: 0,
    projectiles: [] as Projectile[],
    enemies: [
      { pos: { x: 700, y: 400 }, width: 25, height: 60, color: '#f472b6', velX: 2, hp: 5, dead: false },
      { pos: { x: 1000, y: 320 }, width: 25, height: 60, color: '#4ade80', velX: -3, hp: 8, dead: false },
      { pos: { x: 1500, y: 260 }, width: 25, height: 60, color: '#818cf8', velX: 2.5, hp: 10, dead: false },
      { pos: { x: 2100, y: 380 }, width: 25, height: 60, color: '#facc15', velX: -2, hp: 15, dead: false },
    ] as PlatformEnemy[],
    cooldown: 0,
    keys: {} as Record<string, boolean>
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => state.current.keys[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => state.current.keys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

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

      const s = state.current;
      const p = s.player;

      p.velX = 0;
      if (s.keys['a']) p.velX = -WALK_SPEED;
      if (s.keys['d']) p.velX = WALK_SPEED;
      if ((s.keys['w'] || s.keys[' ']) && p.grounded) {
        p.velY = JUMP_FORCE;
        p.grounded = false;
        SoundSystem.playJump();
      }

      p.velY += GRAVITY;
      p.x += p.velX;
      p.y += p.velY;

      // Platform Collisions
      p.grounded = false;
      PLATFORMS.forEach(plat => {
        if (p.x < plat.x + plat.w && p.x + p.width > plat.x &&
            p.y + p.height > plat.y && p.y + p.height < plat.y + plat.h + p.velY) {
          if (p.velY > 0) {
            p.y = plat.y - p.height;
            p.velY = 0;
            p.grounded = true;
          }
        }
      });

      // Reset on fall
      if (p.y > CANVAS_HEIGHT + 200) {
          p.x = 100; p.y = 400; p.velY = 0;
          SoundSystem.playPlayerHit();
      }

      s.cameraX = p.x - CANVAS_WIDTH / 3;

      // Combat logic
      if ((s.keys['f'] || s.keys[' ']) && s.cooldown <= 0 && playerStats.weaponLevel > 0) {
        SoundSystem.playShoot(playerStats.weaponLevel);
        s.cooldown = playerStats.shootCooldown;
        s.projectiles.push({
          id: Math.random(),
          pos: { x: p.x + p.width, y: p.y + p.height / 2 },
          vel: { x: 14, y: 0 },
          width: 15, height: 6,
          color: '#22d3ee',
          active: true,
          damage: 1
        });
      }
      s.cooldown--;

      s.projectiles = s.projectiles.map(pr => {
        pr.pos.x += pr.vel.x;
        return pr;
      }).filter(pr => pr.pos.x < s.cameraX + CANVAS_WIDTH + 200 && pr.active);

      s.enemies.forEach(e => {
        if (e.dead) return;
        e.pos.x += e.velX;
        if (Math.random() < 0.01) e.velX *= -1; 
        
        s.projectiles.forEach(pr => {
          if (pr.active && pr.pos.x < e.pos.x + e.width && pr.pos.x + pr.width > e.pos.x &&
              pr.pos.y < e.pos.y + e.height && pr.pos.y + pr.height > e.pos.y) {
            pr.active = false;
            e.hp -= (playerStats.weaponLevel === 3 ? 5 : 2);
            SoundSystem.playEnemyHit();
            if (e.hp <= 0) e.dead = true;
          }
        });
      });

      if (p.x > GOAL_X) {
        onVictory();
        return;
      }

      // Render Loop
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.translate(-s.cameraX, 0);

      // Cyber-Grid Background
      ctx.strokeStyle = '#22d3ee08';
      for(let x=0; x < GOAL_X + 1000; x += 120) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }

      // Platforms
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#22d3ee55';
      ctx.lineWidth = 2;
      PLATFORMS.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      });

      // Goal visualization
      ctx.fillStyle = '#facc15';
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#facc15';
      ctx.fillRect(GOAL_X, 150, 80, 450);
      ctx.shadowBlur = 0;

      // Entities
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      s.enemies.forEach(e => {
        if (!e.dead) {
          ctx.fillStyle = e.color;
          ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
        }
      });

      s.projectiles.forEach(pr => ctx.fillRect(pr.pos.x, pr.pos.y, pr.width, pr.height));
      
      ctx.restore();

      // UI
      ctx.fillStyle = '#22d3ee';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(`UPLINK PROGRESS: ${Math.min(100, Math.floor((p.x / GOAL_X) * 100))}%`, 30, 40);
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [playerStats, onVictory, isPaused]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute top-4 right-4 z-30">
        <Button onClick={onExit} variant="danger" size="sm">ABORT_UPLINK</Button>
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
    </div>
  );
};

export default SideScrollerCanvas;
