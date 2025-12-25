import React, { useRef, useEffect } from 'react';
import { PlayerStats, FPSEnemy } from '../types';
import { SoundSystem } from '../audio';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { Button } from './Button';

interface FPSCanvasProps {
  player: PlayerStats;
  onVictory: () => void;
  onExit: () => void;
  isPaused?: boolean;
}

const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,0,0,0,1,1,1,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const FPSCanvas: React.FC<FPSCanvasProps> = ({ player, onVictory, onExit, isPaused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const state = useRef({
    pos: { x: 1.5, y: 1.5 },
    dir: { x: 1, y: 0 },
    plane: { x: 0, y: 0.66 },
    enemies: [
      { id: '1', x: 5.5, y: 3.5, hp: 6, color: '#f472b6', dead: false },
      { id: '2', x: 9.5, y: 3.5, hp: 8, color: '#4ade80', dead: false },
      { id: '3', x: 13.5, y: 3.5, hp: 10, color: '#818cf8', dead: false },
      { id: '4', x: 16.5, y: 4.5, hp: 12, color: '#facc15', dead: false },
      { id: '5', x: 28.5, y: 3.5, hp: 15, color: '#22d3ee', dead: false },
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
      const moveSpeed = 0.08;
      const rotSpeed = 0.04;

      if (s.keys['w']) {
        const nextX = s.pos.x + s.dir.x * moveSpeed;
        const nextY = s.pos.y + s.dir.y * moveSpeed;
        if (MAP[Math.floor(nextX)]?.[Math.floor(s.pos.y)] === 0) s.pos.x = nextX;
        if (MAP[Math.floor(s.pos.x)]?.[Math.floor(nextY)] === 0) s.pos.y = nextY;
      }
      if (s.keys['s']) {
        const nextX = s.pos.x - s.dir.x * moveSpeed;
        const nextY = s.pos.y - s.dir.y * moveSpeed;
        if (MAP[Math.floor(nextX)]?.[Math.floor(s.pos.y)] === 0) s.pos.x = nextX;
        if (MAP[Math.floor(s.pos.x)]?.[Math.floor(nextY)] === 0) s.pos.y = nextY;
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

      if ((s.keys[' '] || s.keys['f']) && s.weaponCooldown <= 0) {
        SoundSystem.playShoot(player.weaponLevel);
        s.weaponCooldown = 20;
        s.shake = 15;
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
            if (Math.abs(diff) < 0.35 / dist) {
                e.hp -= (player.weaponLevel === 3 ? 10 : 5);
                if (e.hp <= 0) e.dead = true;
                SoundSystem.playProjectileHit();
            }
        });
      }

      s.weaponCooldown--;
      if (s.shake > 0) s.shake *= 0.85;

      if (s.enemies.every(e => e.dead)) {
          onVictory();
          return;
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);

      const zBuffer: number[] = [];
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
          if (MAP[mapX]?.[mapY] > 0) hit = 1;
        }

        const perpWallDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
        zBuffer[x] = perpWallDist;

        const lineHeight = Math.floor(CANVAS_HEIGHT / perpWallDist);
        let drawStart = -lineHeight / 2 + CANVAS_HEIGHT / 2;
        let drawEnd = lineHeight / 2 + CANVAS_HEIGHT / 2;

        const color = side === 1 ? '#1e293b' : '#334155';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, drawStart);
        ctx.lineTo(x, drawEnd);
        ctx.stroke();
      }

      const activeEnemy = s.enemies.find(e => !e.dead);
      if (activeEnemy) {
        const dx = activeEnemy.x - s.pos.x;
        const dy = activeEnemy.y - s.pos.y;
        const angleToTarget = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(s.dir.y, s.dir.x);
        let angleDiff = angleToTarget - currentAngle;
        while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, 80);
        ctx.rotate(angleDiff);
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(10, 0);
        ctx.lineTo(-10, 0);
        ctx.fill();
        ctx.restore();
        
        ctx.fillStyle = '#22d3ee';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('FOLLOW_WAYPOINT', CANVAS_WIDTH / 2, 50);
      }

      const sortedEnemies = s.enemies
        .map(e => ({ ...e, dist: Math.pow(s.pos.x - e.x, 2) + Math.pow(s.pos.y - e.y, 2) }))
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
          ctx.shadowBlur = 20;
          ctx.shadowColor = e.color;
          ctx.fillRect(spriteScreenX - spriteWidth / 4, CANVAS_HEIGHT / 2 - spriteHeight / 2, spriteWidth / 2, spriteHeight);
          ctx.shadowBlur = 0;
        }
      });

      ctx.save();
      ctx.translate(CANVAS_WIDTH/2, CANVAS_HEIGHT - 120 + s.shake);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-60, 0, 120, 120);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.strokeRect(-60, 0, 120, 120);
      ctx.restore();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [player, onVictory, isPaused]);

  return (
    <div className="relative w-full h-full bg-black cursor-crosshair overflow-hidden">
      <div className="absolute top-4 right-4 z-30">
        <Button onClick={onExit} variant="danger" size="sm">ABORT_UPLINK</Button>
      </div>
      <div className="absolute inset-0 pointer-events-none border-[30px] border-cyan-500/10 z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-cyan-400/50 rounded-full z-20 flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400 rounded-full" />
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-cover" />
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-cyan-400 font-mono text-[10px] tracking-[0.2em] bg-black/80 px-4 py-2 z-20 rounded border border-cyan-500/30 text-center">
        [W/S] MOVE | [A/D] ROTATE | [SPACE/F] FIRE <br/>
        <span className="text-zinc-500 text-[8px] mt-1 block">LINEAR CORRIDOR PROTOCOL: ACTIVE</span>
      </div>
    </div>
  );
};

export default FPSCanvas;