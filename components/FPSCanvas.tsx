import React, { useRef, useEffect } from 'react';
import { PlayerStats, FPSEnemy, Projectile } from '../types';
import { SoundSystem } from '../audio';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface FPSCanvasProps {
  player: PlayerStats;
  onVictory: () => void;
  onDamage: (amt: number) => void;
}

const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,1,1,1,1,0,0,0,1],
  [1,0,0,0,1,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,0,1,0,1,0,1],
  [1,1,1,0,0,0,0,0,0,1,1,1],
  [1,0,0,0,1,1,1,1,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1],
];

const FPSCanvas: React.FC<FPSCanvasProps> = ({ player, onVictory, onDamage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const state = useRef({
    pos: { x: 1.5, y: 1.5 },
    dir: { x: 1, y: 0 },
    plane: { x: 0, y: 0.66 },
    enemies: [
      { id: 1, x: 5.5, y: 5.5, hp: 5, maxHp: 5, color: '#34d399', dead: false, lastShot: 0, state: 'HUNTING' },
      { id: 2, x: 8.5, y: 8.5, hp: 8, maxHp: 8, color: '#60a5fa', dead: false, lastShot: 0, state: 'HUNTING' },
      { id: 3, x: 2.5, y: 10.5, hp: 10, maxHp: 10, color: '#facc15', dead: false, lastShot: 0, state: 'HUNTING' },
      { id: 4, x: 10.5, y: 1.5, hp: 20, maxHp: 20, color: '#f472b6', dead: false, lastShot: 0, state: 'HUNTING' },
    ] as FPSEnemy[],
    projectiles: [] as Projectile[],
    weaponCooldown: 0,
    keys: {} as Record<string, boolean>,
    time: 0
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
      const s = state.current;
      s.time = time;
      
      const moveSpeed = s.keys['shift'] ? 0.12 : 0.08;
      const rotSpeed = 0.05;

      const dirX = s.dir.x;
      const dirY = s.dir.y;

      if (s.keys['w']) {
        if (MAP[Math.floor(s.pos.x + dirX * moveSpeed)][Math.floor(s.pos.y)] === 0) s.pos.x += dirX * moveSpeed;
        if (MAP[Math.floor(s.pos.x)][Math.floor(s.pos.y + dirY * moveSpeed)] === 0) s.pos.y += dirY * moveSpeed;
      }
      if (s.keys['s']) {
        if (MAP[Math.floor(s.pos.x - dirX * moveSpeed)][Math.floor(s.pos.y)] === 0) s.pos.x -= dirX * moveSpeed;
        if (MAP[Math.floor(s.pos.x)][Math.floor(s.pos.y - dirY * moveSpeed)] === 0) s.pos.y -= dirY * moveSpeed;
      }
      if (s.keys['a'] || s.keys['q']) {
        const oldDirX = s.dir.x;
        s.dir.x = s.dir.x * Math.cos(rotSpeed) - s.dir.y * Math.sin(rotSpeed);
        s.dir.y = oldDirX * Math.sin(rotSpeed) + s.dir.y * Math.cos(rotSpeed);
        const oldPlaneX = s.plane.x;
        s.plane.x = s.plane.x * Math.cos(rotSpeed) - s.plane.y * Math.sin(rotSpeed);
        s.plane.y = oldPlaneX * Math.sin(rotSpeed) + s.plane.y * Math.cos(rotSpeed);
      }
      if (s.keys['d'] || s.keys['e']) {
        const oldDirX = s.dir.x;
        s.dir.x = s.dir.x * Math.cos(-rotSpeed) - s.dir.y * Math.sin(-rotSpeed);
        s.dir.y = oldDirX * Math.sin(-rotSpeed) + s.dir.y * Math.cos(-rotSpeed);
        const oldPlaneX = s.plane.x;
        s.plane.x = s.plane.x * Math.cos(-rotSpeed) - s.plane.y * Math.sin(-rotSpeed);
        s.plane.y = oldPlaneX * Math.sin(-rotSpeed) + s.plane.y * Math.cos(-rotSpeed);
      }

      // Shooting - larger hitboxes for easier aiming
      if ((s.keys[' '] || s.keys['f']) && s.weaponCooldown <= 0) {
        SoundSystem.playShoot(player.weaponLevel);
        s.weaponCooldown = player.shootCooldown;
        s.enemies.forEach(e => {
            if (e.dead) return;
            const dx = e.x - s.pos.x;
            const dy = e.y - s.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx);
            const playerAngle = Math.atan2(s.dir.y, s.dir.x);
            let diff = angle - playerAngle;
            while(diff < -Math.PI) diff += Math.PI * 2;
            while(diff > Math.PI) diff -= Math.PI * 2;
            if (Math.abs(diff) < 0.5 / dist) { // Increased hit cone
                e.hp -= player.weaponLevel + 5;
                if (e.hp <= 0) e.dead = true;
                SoundSystem.playEnemyHit();
            }
        });
      }
      s.weaponCooldown--;

      // AI - Slower projectiles
      s.enemies.forEach(e => {
        if (e.dead) return;
        const dx = s.pos.x - e.x;
        const dy = s.pos.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 10) {
            e.state = 'FIRING';
            if (time - e.lastShot > 1800) { // Slower fire rate
                s.projectiles.push({
                    id: Math.random(), pos: { x: e.x, y: e.y }, 
                    vel: { x: dx / dist * 0.08, y: dy / dist * 0.08 }, // Slower bullets
                    width: 0.15, height: 0.15, color: '#f87171', active: true, damage: 1, owner: 'enemy'
                });
                e.lastShot = time;
                SoundSystem.playWallHit();
            }
        } else {
            e.state = 'HUNTING';
            e.x += (dx / dist) * 0.03;
            e.y += (dy / dist) * 0.03;
        }
      });

      s.projectiles.forEach(p => {
        p.pos.x += p.vel.x; p.pos.y += p.vel.y;
        if (Math.hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y) < 0.25) { p.active = false; onDamage(1); }
        if (MAP[Math.floor(p.pos.x)][Math.floor(p.pos.y)] > 0) p.active = false;
      });
      s.projectiles = s.projectiles.filter(p => p.active);

      if (s.enemies.every(e => e.dead)) { onVictory(); return; }

      ctx.fillStyle = '#020205'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const zBuffer: number[] = [];

      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const cameraX = 2 * x / CANVAS_WIDTH - 1;
        const rayDirX = s.dir.x + s.plane.x * cameraX;
        const rayDirY = s.dir.y + s.plane.y * cameraX;
        let mapX = Math.floor(s.pos.x);
        let mapY = Math.floor(s.pos.y);
        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);
        let sideDistX, sideDistY, stepX, stepY, hit = 0, side = 0;

        if (rayDirX < 0) { stepX = -1; sideDistX = (s.pos.x - mapX) * deltaDistX; }
        else { stepX = 1; sideDistX = (mapX + 1.0 - s.pos.x) * deltaDistX; }
        if (rayDirY < 0) { stepY = -1; sideDistY = (s.pos.y - mapY) * deltaDistY; }
        else { stepY = 1; sideDistY = (mapY + 1.0 - s.pos.y) * deltaDistY; }

        while (hit === 0) {
          if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
          else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
          if (MAP[mapX][mapY] > 0) hit = 1;
        }
        const perpWallDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
        zBuffer[x] = perpWallDist;
        const lineHeight = Math.floor(CANVAS_HEIGHT / perpWallDist);
        const drawStart = -lineHeight / 2 + CANVAS_HEIGHT / 2;
        const drawEnd = lineHeight / 2 + CANVAS_HEIGHT / 2;
        ctx.strokeStyle = side === 1 ? '#0a0a2a' : '#1a1a3a';
        ctx.beginPath(); ctx.moveTo(x, drawStart); ctx.lineTo(x, drawEnd); ctx.stroke();
      }

      const sprites = [...s.enemies.filter(e => !e.dead), ...s.projectiles]
        .map(obj => ({ obj, dist: Math.pow(s.pos.x - ((obj as any).x || (obj as any).pos.x), 2) + Math.pow(s.pos.y - ((obj as any).y || (obj as any).pos.y), 2) }))
        .sort((a, b) => b.dist - a.dist);

      sprites.forEach(({ obj }) => {
        const ox = (obj as any).x || (obj as any).pos.x;
        const oy = (obj as any).y || (obj as any).pos.y;
        const sx = ox - s.pos.x; const sy = oy - s.pos.y;
        const invDet = 1.0 / (s.plane.x * s.dir.y - s.dir.x * s.plane.y);
        const tx = invDet * (s.dir.y * sx - s.dir.x * sy);
        const ty = invDet * (-s.plane.y * sx + s.plane.x * sy);
        if (ty <= 0) return;
        const ssx = Math.floor((CANVAS_WIDTH / 2) * (1 + tx / ty));
        const sh = Math.abs(Math.floor(CANVAS_HEIGHT / ty));
        const sw = Math.abs(Math.floor(CANVAS_HEIGHT / ty));
        if (ssx > -sw && ssx < CANVAS_WIDTH && ty < zBuffer[ssx]) {
          const isE = (obj as any).hp !== undefined;
          ctx.fillStyle = isE ? (obj as any).color : '#f87171';
          const w = isE ? sw/2 : sw/8; const h = isE ? sh : sh/8;
          ctx.fillRect(ssx - w/2, CANVAS_HEIGHT/2 - h/2, w, h);
          if (isE) {
            ctx.fillStyle = '#000'; ctx.fillRect(ssx - 20, CANVAS_HEIGHT/2 - h/2 - 10, 40, 4);
            ctx.fillStyle = '#4ade80'; ctx.fillRect(ssx - 20, CANVAS_HEIGHT/2 - h/2 - 10, 40 * ((obj as any).hp / (obj as any).maxHp), 4);
          }
        }
      });

      const bob = Math.sin(time / 150) * 10;
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(CANVAS_WIDTH/2 - 40, CANVAS_HEIGHT - 100 + bob, 80, 100);
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4; ctx.strokeRect(CANVAS_WIDTH/2 - 40, CANVAS_HEIGHT - 100 + bob, 80, 100);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [player, onVictory, onDamage]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full bg-black" />;
};

export default FPSCanvas;