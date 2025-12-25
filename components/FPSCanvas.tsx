import React, { useRef, useEffect, useState } from 'react';
import { PlayerStats, FPSEnemy } from '../types';
import { SoundSystem } from '../audio';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface FPSCanvasProps {
  player: PlayerStats;
  onVictory: () => void;
}

const MAP_SIZE = 12;
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,1,1,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,1,0,1],
  [1,0,1,0,1,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,1,1,0,0,0,1],
  [1,0,1,1,1,0,1,0,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
];

const FPSCanvas: React.FC<FPSCanvasProps> = ({ player, onVictory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const state = useRef({
    pos: { x: 1.5, y: 1.5 },
    dir: { x: 1, y: 0 },
    plane: { x: 0, y: 0.66 },
    enemies: [
      { x: 3.5, y: 3.5, hp: 5, color: '#34d399', dead: false },
      { x: 8.5, y: 8.5, hp: 8, color: '#60a5fa', dead: false },
      { x: 2.5, y: 10.5, hp: 12, color: '#facc15', dead: false },
      { x: 10.5, y: 1.5, hp: 15, color: '#f472b6', dead: false },
    ] as FPSEnemy[],
    weaponCooldown: 0,
    shake: 0,
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
      
      // Movement logic
      const moveSpeed = 0.08;
      const rotSpeed = 0.04;

      if (s.keys['w']) {
        if (MAP[Math.floor(s.pos.x + s.dir.x * moveSpeed)][Math.floor(s.pos.y)] === 0) s.pos.x += s.dir.x * moveSpeed;
        if (MAP[Math.floor(s.pos.x)][Math.floor(s.pos.y + s.dir.y * moveSpeed)] === 0) s.pos.y += s.dir.y * moveSpeed;
      }
      if (s.keys['s']) {
        if (MAP[Math.floor(s.pos.x - s.dir.x * moveSpeed)][Math.floor(s.pos.y)] === 0) s.pos.x -= s.dir.x * moveSpeed;
        if (MAP[Math.floor(s.pos.x)][Math.floor(s.pos.y - s.dir.y * moveSpeed)] === 0) s.pos.y -= s.dir.y * moveSpeed;
      }
      if (s.keys['a'] || s.keys['arrowleft']) {
        const oldDirX = s.dir.x;
        s.dir.x = s.dir.x * Math.cos(rotSpeed) - s.dir.y * Math.sin(rotSpeed);
        s.dir.y = oldDirX * Math.sin(rotSpeed) + s.dir.y * Math.cos(rotSpeed);
        const oldPlaneX = s.plane.x;
        s.plane.x = s.plane.x * Math.cos(rotSpeed) - s.plane.y * Math.sin(rotSpeed);
        s.plane.y = oldPlaneX * Math.sin(rotSpeed) + s.plane.y * Math.cos(rotSpeed);
      }
      if (s.keys['d'] || s.keys['arrowright']) {
        const oldDirX = s.dir.x;
        s.dir.x = s.dir.x * Math.cos(-rotSpeed) - s.dir.y * Math.sin(-rotSpeed);
        s.dir.y = oldDirX * Math.sin(-rotSpeed) + s.dir.y * Math.cos(-rotSpeed);
        const oldPlaneX = s.plane.x;
        s.plane.x = s.plane.x * Math.cos(-rotSpeed) - s.plane.y * Math.sin(-rotSpeed);
        s.plane.y = oldPlaneX * Math.sin(-rotSpeed) + s.plane.y * Math.cos(-rotSpeed);
      }

      // Shooting
      if ((s.keys[' '] || s.keys['f']) && s.weaponCooldown <= 0) {
        SoundSystem.playShoot(player.weaponLevel);
        s.weaponCooldown = 15;
        s.shake = 10;
        
        // Hit detection (Center of screen)
        // In simple raycasting FPS, we check sprites in a narrow angle
        s.enemies.forEach(e => {
            if (e.dead) return;
            const dx = e.x - s.pos.x;
            const dy = e.y - s.pos.y;
            const angle = Math.atan2(dy, dx);
            const playerAngle = Math.atan2(s.dir.y, s.dir.x);
            let diff = angle - playerAngle;
            while(diff < -Math.PI) diff += Math.PI * 2;
            while(diff > Math.PI) diff -= Math.PI * 2;
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (Math.abs(diff) < 0.2 / dist) { // Simple aim assist
                e.hp -= player.weaponLevel === 3 ? 5 : 2;
                if (e.hp <= 0) e.dead = true;
                SoundSystem.playProjectileHit();
            }
        });
      }
      s.weaponCooldown--;
      if (s.shake > 0) s.shake *= 0.8;

      if (s.enemies.every(e => e.dead)) {
          onVictory();
          return;
      }

      // Render
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const zBuffer: number[] = [];

      // Draw Walls (Raycasting)
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const cameraX = 2 * x / CANVAS_WIDTH - 1;
        const rayDirX = s.dir.x + s.plane.x * cameraX;
        const rayDirY = s.dir.y + s.plane.y * cameraX;

        let mapX = Math.floor(s.pos.x);
        let mapY = Math.floor(s.pos.y);

        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);
        let sideDistX, sideDistY, stepX, stepY;

        if (rayDirX < 0) {
          stepX = -1; sideDistX = (s.pos.x - mapX) * deltaDistX;
        } else {
          stepX = 1; sideDistX = (mapX + 1.0 - s.pos.x) * deltaDistX;
        }
        if (rayDirY < 0) {
          stepY = -1; sideDistY = (s.pos.y - mapY) * deltaDistY;
        } else {
          stepY = 1; sideDistY = (mapY + 1.0 - s.pos.y) * deltaDistY;
        }

        let hit = 0, side = 0;
        while (hit === 0) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaDistX; mapX += stepX; side = 0;
          } else {
            sideDistY += deltaDistY; mapY += stepY; side = 1;
          }
          if (MAP[mapX][mapY] > 0) hit = 1;
        }

        const perpWallDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
        zBuffer[x] = perpWallDist;

        const lineHeight = Math.floor(CANVAS_HEIGHT / perpWallDist);
        let drawStart = -lineHeight / 2 + CANVAS_HEIGHT / 2;
        let drawEnd = lineHeight / 2 + CANVAS_HEIGHT / 2;

        const color = side === 1 ? '#080808' : '#111';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, drawStart);
        ctx.lineTo(x, drawEnd);
        ctx.stroke();
        
        // Neon edge highlights
        if (x % 40 === 0) {
            ctx.strokeStyle = '#22d3ee22';
            ctx.strokeRect(x, drawStart, 1, drawEnd - drawStart);
        }
      }

      // Draw Enemies (Sprites)
      const sortedEnemies = s.enemies
        .map((e, i) => ({ ...e, dist: Math.pow(s.pos.x - e.x, 2) + Math.pow(s.pos.y - e.y, 2) }))
        .sort((a, b) => b.dist - a.dist);

      sortedEnemies.forEach(e => {
        if (e.dead) return;
        const spriteX = e.x - s.pos.x;
        const spriteY = e.y - s.pos.y;
        const invDet = 1.0 / (s.plane.x * s.dir.y - s.dir.x * s.plane.y);
        const transformX = invDet * (s.dir.y * spriteX - s.dir.x * spriteY);
        const transformY = invDet * (-s.plane.y * spriteX + s.plane.x * spriteY);

        const spriteScreenX = Math.floor((CANVAS_WIDTH / 2) * (1 + transformX / transformY));
        const spriteHeight = Math.abs(Math.floor(CANVAS_HEIGHT / transformY));
        const spriteWidth = Math.abs(Math.floor(CANVAS_HEIGHT / transformY));

        if (transformY > 0 && spriteScreenX > -spriteWidth && spriteScreenX < CANVAS_WIDTH && transformY < zBuffer[spriteScreenX]) {
          ctx.fillStyle = e.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = e.color;
          // Render as a 3D Paddle
          ctx.fillRect(spriteScreenX - spriteWidth / 4, CANVAS_HEIGHT / 2 - spriteHeight / 2, spriteWidth / 2, spriteHeight);
          ctx.shadowBlur = 0;
          
          // HP Bar
          ctx.fillStyle = '#fff';
          ctx.fillRect(spriteScreenX - 20, CANVAS_HEIGHT / 2 - spriteHeight / 2 - 10, 40 * (e.hp / 20), 4);
        }
      });

      // Weapon Viewport
      ctx.save();
      ctx.translate(CANVAS_WIDTH/2, CANVAS_HEIGHT - 100 + s.shake);
      ctx.fillStyle = '#222';
      ctx.fillRect(-60, 0, 120, 100);
      ctx.strokeStyle = '#22d3ee';
      ctx.strokeRect(-60, 0, 120, 100);
      ctx.restore();

      // UI
      ctx.fillStyle = '#fff';
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText(`TARGETS REMAINING: ${s.enemies.filter(e=>!e.dead).length}`, 20, 40);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [player, onVictory]);

  return (
    <div className="relative w-full h-full bg-black cursor-crosshair overflow-hidden">
      <div className="absolute inset-0 pointer-events-none border-[20px] border-cyan-500/10 z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/50 rounded-full z-20" />
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-cover" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-cyan-400 font-mono text-[10px] tracking-widest bg-black/50 p-2 z-20">
        [WASD] MOVE // [SPACE/CLICK] FIRE // [ARROWS] LOOK
      </div>
    </div>
  );
};

export default FPSCanvas;