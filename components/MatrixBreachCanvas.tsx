import React, { useRef, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { SoundSystem } from '../audio';

interface MatrixBreachProps {
  onVictory: () => void;
}

const WALLS = [
  { x: 200, y: 0, w: 20, h: 200 },
  { x: 200, y: 300, w: 20, h: 300 },
  { x: 400, y: 100, w: 20, h: 400 },
  { x: 600, y: 0, w: 20, h: 250 },
  { x: 600, y: 350, w: 20, h: 250 },
];

const MatrixBreachCanvas: React.FC<MatrixBreachProps> = ({ onVictory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const state = useRef({
    player: { x: 50, y: CANVAS_HEIGHT / 2, size: 15 },
    packets: [
      { x: 300, y: 100, collected: false },
      { x: 300, y: 500, collected: false },
      { x: 500, y: 300, collected: false },
      { x: 700, y: 100, collected: false },
      { x: 700, y: 500, collected: false },
    ],
    sentinels: [
      { x: 250, y: 150, r: 80, angle: 0, speed: 0.02 },
      { x: 450, y: 450, r: 100, angle: Math.PI, speed: -0.015 },
      { x: 650, y: 300, r: 120, angle: 0, speed: 0.01 },
    ],
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

      // Player Movement
      const moveSpeed = 4;
      let dx = 0, dy = 0;
      if (s.keys['w']) dy -= moveSpeed;
      if (s.keys['s']) dy += moveSpeed;
      if (s.keys['a']) dx -= moveSpeed;
      if (s.keys['d']) dx += moveSpeed;

      // Collision with walls
      const nextX = p.x + dx;
      const nextY = p.y + dy;
      let canMoveX = true;
      let canMoveY = true;

      WALLS.forEach(w => {
        if (nextX + p.size > w.x && nextX - p.size < w.x + w.w &&
            p.y + p.size > w.y && p.y - p.size < w.y + w.h) canMoveX = false;
        if (p.x + p.size > w.x && p.x - p.size < w.x + w.w &&
            nextY + p.size > w.y && nextY - p.size < w.y + w.h) canMoveY = false;
      });

      if (canMoveX) p.x = Math.max(p.size, Math.min(CANVAS_WIDTH - p.size, nextX));
      if (canMoveY) p.y = Math.max(p.size, Math.min(CANVAS_HEIGHT - p.size, nextY));

      // Packet Collection
      s.packets.forEach(pkt => {
        if (!pkt.collected) {
          const dist = Math.hypot(p.x - pkt.x, p.y - pkt.y);
          if (dist < 20) {
            pkt.collected = true;
            SoundSystem.playUiClick();
          }
        }
      });

      // Sentinel Detection
      s.sentinels.forEach(sen => {
        sen.angle += sen.speed;
        const scanX = sen.x + Math.cos(sen.angle) * 50;
        const scanY = sen.y + Math.sin(sen.angle) * 50;
        const dist = Math.hypot(p.x - scanX, p.y - scanY);
        
        if (dist < sen.r) {
          // Detected! Reset player
          p.x = 50; p.y = CANVAS_HEIGHT / 2;
          SoundSystem.playPlayerHit();
        }
      });

      if (s.packets.every(pkt => pkt.collected) && p.x > CANVAS_WIDTH - 50) {
        onVictory();
        return;
      }

      // Render
      ctx.fillStyle = '#020502';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Matrix Grid
      ctx.strokeStyle = '#0a200a';
      ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
      }

      // Walls
      ctx.fillStyle = '#1a3a1a';
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      WALLS.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      });

      // Sentinels
      s.sentinels.forEach(sen => {
        const scanX = sen.x + Math.cos(sen.angle) * 50;
        const scanY = sen.y + Math.sin(sen.angle) * 50;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(scanX, scanY, sen.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
      });

      // Packets
      s.packets.forEach(pkt => {
        if (!pkt.collected) {
          ctx.fillStyle = '#facc15';
          ctx.shadowBlur = 15; ctx.shadowColor = '#facc15';
          ctx.fillRect(pkt.x - 5, pkt.y - 5, 10, 10);
        }
      });

      // Player
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 20; ctx.shadowColor = '#4ade80';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.shadowBlur = 0;

      // UI
      ctx.fillStyle = '#4ade80';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(`PACKETS_SECURED: ${s.packets.filter(p=>p.collected).length}/5`, 20, 30);
      if (s.packets.every(p=>p.collected)) {
        ctx.fillStyle = '#fff';
        ctx.fillText("EXIT_PORTAL_OPEN_AT_RIGHT_EDGE", CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT - 30);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [onVictory]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden cursor-none">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
    </div>
  );
};

export default MatrixBreachCanvas;
