import React, { useRef, useEffect } from 'react';
import { PlayerStats, Projectile, ShooterEnemy } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { SoundSystem } from '../audio';

interface SpaceShooterProps {
  playerStats: PlayerStats;
  onVictory: () => void;
  onGameOver: () => void;
  onDamage: (amt: number) => void;
}

const SpaceShooterCanvas: React.FC<SpaceShooterProps> = ({ playerStats, onVictory, onGameOver, onDamage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const state = useRef({
    player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, w: 35, h: 45 },
    enemies: [] as ShooterEnemy[],
    projectiles: [] as Projectile[],
    enemyProjectiles: [] as Projectile[],
    bgY: 0,
    cooldown: 0,
    score: 0,
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
      const speed = 8;
      if (s.keys['w']) p.y -= speed;
      if (s.keys['s']) p.y += speed;
      if (s.keys['a']) p.x -= speed;
      if (s.keys['d']) p.x += speed;
      p.x = Math.max(0, Math.min(CANVAS_WIDTH - p.w, p.x));
      p.y = Math.max(0, Math.min(CANVAS_HEIGHT - p.h, p.y));

      if ((s.keys[' '] || s.keys['f']) && s.cooldown <= 0) {
        SoundSystem.playShoot(playerStats.weaponLevel);
        s.cooldown = playerStats.shootCooldown;
        const damage = 2; // Extra damage for easy mode
        s.projectiles.push({ id: Math.random(), pos: { x: p.x + p.w / 2 - 3, y: p.y }, vel: { x: 0, y: -15 }, width: 6, height: 15, color: '#22d3ee', active: true, damage, owner: 'player' });
      }
      s.cooldown--;

      if (Math.random() < 0.04 && s.enemies.length < 6) {
        s.enemies.push({ pos: { x: Math.random() * (CANVAS_WIDTH - 30), y: -50 }, width: 30, height: 30, color: '#f472b6', hp: 2, lastShot: 0, dead: false });
      }

      s.enemies.forEach(e => {
        e.pos.y += 2; // Slower enemy movement
        if (Math.random() < 0.01) { // Half the fire rate
          s.enemyProjectiles.push({ id: Math.random(), pos: { x: e.pos.x + 15, y: e.pos.y + 30 }, vel: { x: 0, y: 4 }, width: 5, height: 5, color: '#f87171', active: true, damage: 1, owner: 'enemy' });
        }
      });

      s.projectiles.forEach(pr => {
        if (!pr.active) return;
        pr.pos.y += pr.vel.y;
        s.enemies.forEach(e => {
          if (!e.dead && pr.pos.x < e.pos.x + e.width && pr.pos.x + pr.width > e.pos.x && pr.pos.y < e.pos.y + e.height && pr.pos.y + pr.height > e.pos.y) {
            pr.active = false; e.hp -= pr.damage; SoundSystem.playEnemyHit(); if (e.hp <= 0) { e.dead = true; s.score += 15; }
          }
        });
      });

      s.enemyProjectiles.forEach(pr => {
        pr.pos.y += pr.vel.y;
        if (pr.active && pr.pos.x < p.x + p.w && pr.pos.x + pr.width > p.x && pr.pos.y < p.y + p.h && pr.pos.y + pr.height > p.y) {
          pr.active = false; onDamage(1); SoundSystem.playPlayerHit();
        }
      });

      s.enemies = s.enemies.filter(e => e.pos.y < CANVAS_HEIGHT && !e.dead);
      s.projectiles = s.projectiles.filter(pr => pr.pos.y > -20 && pr.active);
      if (s.score >= 80) { onVictory(); return; } // Lower victory requirement

      ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#22d3ee'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#22d3ee'; s.projectiles.forEach(pr => ctx.fillRect(pr.pos.x, pr.pos.y, pr.width, pr.height));
      ctx.fillStyle = '#f87171'; s.enemyProjectiles.forEach(pr => ctx.fillRect(pr.pos.x, pr.pos.y, pr.width, pr.height));
      s.enemies.forEach(e => { ctx.fillStyle = e.color; ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height); });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [playerStats, onVictory, onGameOver, onDamage]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full bg-black object-contain" />;
};

export default SpaceShooterCanvas;