import React, { useRef, useEffect } from 'react';
import { PlayerStats, Projectile, PlatformEnemy } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { SoundSystem } from '../audio';

interface SideScrollerProps {
  playerStats: PlayerStats;
  onVictory: () => void;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const WALK_SPEED = 5;

const PLATFORMS = [
  { x: 0, y: 550, w: 400, h: 50 },
  { x: 450, y: 480, w: 200, h: 20 },
  { x: 700, y: 400, w: 300, h: 20 },
  { x: 1100, y: 350, w: 400, h: 20 },
  { x: 1600, y: 450, w: 300, h: 20 },
  { x: 2000, y: 500, w: 600, h: 100 }, // Neural Uplink floor
];

const GOAL_X = 2400;

const SideScrollerCanvas: React.FC<SideScrollerProps> = ({ playerStats, onVictory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const state = useRef({
    player: {
      x: 50, y: 400, velX: 0, velY: 0, 
      width: 20, height: 60,
      grounded: false
    },
    cameraX: 0,
    projectiles: [] as Projectile[],
    enemies: [
      { pos: { x: 500, y: 420 }, width: 20, height: 60, color: '#f87171', velX: -2, hp: 3, dead: false },
      { pos: { x: 800, y: 340 }, width: 20, height: 60, color: '#facc15', velX: 2, hp: 5, dead: false },
      { pos: { x: 1200, y: 290 }, width: 20, height: 60, color: '#60a5fa', velX: -3, hp: 5, dead: false },
      { pos: { x: 1800, y: 390 }, width: 20, height: 60, color: '#f472b6', velX: 4, hp: 8, dead: false },
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

    const animate = () => {
      const s = state.current;
      const p = s.player;

      // Input
      p.velX = 0;
      if (s.keys['a']) p.velX = -WALK_SPEED;
      if (s.keys['d']) p.velX = WALK_SPEED;
      if ((s.keys['w'] || s.keys[' ']) && p.grounded) {
        p.velY = JUMP_FORCE;
        p.grounded = false;
        SoundSystem.playJump();
      }

      // Physics
      p.velY += GRAVITY;
      p.x += p.velX;
      p.y += p.velY;

      // Platform Collision
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

      // Constraints
      if (p.y > CANVAS_HEIGHT + 100) { // Fall off
          p.x = 50; p.y = 400; p.velY = 0;
      }

      // Camera
      s.cameraX = p.x - CANVAS_WIDTH / 4;

      // Shooting
      if (s.keys['f'] && s.cooldown <= 0 && playerStats.weaponLevel > 0) {
        SoundSystem.playShoot(playerStats.weaponLevel);
        s.cooldown = playerStats.shootCooldown;
        s.projectiles.push({
          id: Math.random(),
          pos: { x: p.x + p.width, y: p.y + p.height / 2 },
          vel: { x: 12, y: 0 },
          width: 10, height: 4,
          color: '#22d3ee',
          active: true,
          damage: 1
        });
      }
      s.cooldown--;

      // Update Projectiles
      s.projectiles = s.projectiles.map(pr => {
        pr.pos.x += pr.vel.x;
        return pr;
      }).filter(pr => pr.pos.x < s.cameraX + CANVAS_WIDTH + 100 && pr.active);

      // Update Enemies
      s.enemies.forEach(e => {
        if (e.dead) return;
        e.pos.x += e.velX;
        // Simple patrol bounds or platform check
        if (Math.random() < 0.02) e.velX *= -1;

        // Collision with projectiles
        s.projectiles.forEach(pr => {
          if (pr.active && pr.pos.x < e.pos.x + e.width && pr.pos.x + pr.width > e.pos.x &&
              pr.pos.y < e.pos.y + e.height && pr.pos.y + pr.height > e.pos.y) {
            pr.active = false;
            e.hp -= 1;
            SoundSystem.playEnemyHit();
            if (e.hp <= 0) e.dead = true;
          }
        });
      });

      // Goal Check
      if (p.x > GOAL_X) {
        onVictory();
        return;
      }

      // Render
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.translate(-s.cameraX, 0);

      // Grid Background
      ctx.strokeStyle = '#111';
      for(let x=0; x < GOAL_X + 1000; x += 100) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }

      // Platforms
      ctx.fillStyle = '#0a0a1a';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      PLATFORMS.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      });

      // Player
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22d3ee';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Projectiles
      ctx.fillStyle = '#22d3ee';
      s.projectiles.forEach(pr => {
        if(pr.active) ctx.fillRect(pr.pos.x, pr.pos.y, pr.width, pr.height);
      });

      // Enemies
      s.enemies.forEach(e => {
        if (e.dead) return;
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
      });

      // Goal (Neural Uplink)
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#facc15';
      ctx.fillRect(GOAL_X, 200, 60, 350);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText("NEURAL_UPLINK", GOAL_X - 40, 180);

      ctx.restore();

      // UI
      ctx.fillStyle = '#fff';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(`SECTOR PROGRESS: ${Math.floor((p.x / GOAL_X) * 100)}%`, 20, 30);
      ctx.fillText(`CONTROLS: WASD MOVE | F SHOOT`, 20, CANVAS_HEIGHT - 20);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [playerStats, onVictory]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none border-[10px] border-cyan-500/5 z-10" />
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
    </div>
  );
};

export default SideScrollerCanvas;