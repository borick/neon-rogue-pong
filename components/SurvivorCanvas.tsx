import React, { useRef, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { SoundSystem } from '../audio';

interface SurvivorCanvasProps {
  onComplete: () => void;
}

const SurvivorCanvas: React.FC<SurvivorCanvasProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const state = useRef({
    player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, r: 10 },
    enemies: [] as { x: number, y: number, r: number }[],
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number }[],
    timer: 15,
    lastSpawn: 0,
    keys: {} as Record<string, boolean>
  });

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => state.current.keys[e.key.toLowerCase()] = true;
    const handleUp = (e: KeyboardEvent) => state.current.keys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      const s = state.current;
      const p = s.player;

      // Movement
      const speed = 5;
      if (s.keys['w']) p.y -= speed;
      if (s.keys['s']) p.y += speed;
      if (s.keys['a']) p.x -= speed;
      if (s.keys['d']) p.x += speed;

      // Spawn
      if (time - s.lastSpawn > 300) {
        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        if (side === 0) { x = Math.random() * CANVAS_WIDTH; y = -20; }
        else if (side === 1) { x = CANVAS_WIDTH + 20; y = Math.random() * CANVAS_HEIGHT; }
        else if (side === 2) { x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + 20; }
        else { x = -20; y = Math.random() * CANVAS_HEIGHT; }
        s.enemies.push({ x, y, r: 8 });
        s.lastSpawn = time;
      }

      // Logic
      s.enemies.forEach((e, idx) => {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.hypot(dx, dy);
        e.x += (dx / dist) * 2;
        e.y += (dy / dist) * 2;

        if (dist < p.r + e.r) {
          s.enemies.splice(idx, 1);
          SoundSystem.playEnemyHit();
          for(let i=0; i<10; i++) s.particles.push({ 
            x: e.x, y: e.y, 
            vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, 
            life: 1.0 
          });
        }
      });

      s.particles = s.particles.filter(pt => {
        pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
        return pt.life > 0;
      });

      s.timer -= 1/60;
      if (s.timer <= 0) {
        onComplete();
        return;
      }

      // Render
      ctx.fillStyle = '#0a001a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield
      ctx.fillStyle = '#fff';
      for(let i=0; i<50; i++) ctx.fillRect((i*17)%CANVAS_WIDTH, (i*23+time/10)%CANVAS_HEIGHT, 1, 1);

      // Enemies
      ctx.fillStyle = '#f87171';
      s.enemies.forEach(e => {
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
      });

      // Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = `rgba(255, 255, 255, ${pt.life})`;
        ctx.fillRect(pt.x, pt.y, 2, 2);
      });

      // Player
      ctx.fillStyle = '#4ade80';
      ctx.shadowBlur = 20; ctx.shadowColor = '#4ade80';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

      // UI
      ctx.fillStyle = '#fff';
      ctx.font = '20px "Press Start 2P"';
      ctx.fillText(`PURGE_PROTOCOL: ${Math.ceil(s.timer)}s`, 50, 60);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [onComplete]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />;
};

export default SurvivorCanvas;