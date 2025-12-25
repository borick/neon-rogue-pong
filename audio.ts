let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  if (!noiseBuffer && audioCtx) {
    const bufferSize = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  }

  if (!droneOsc && audioCtx) {
    droneOsc = audioCtx.createOscillator();
    droneGain = audioCtx.createGain();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.value = 40; 
    droneGain.gain.value = 0.03;
    const lpf = audioCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 300;
    droneOsc.connect(lpf);
    lpf.connect(droneGain);
    droneGain.connect(audioCtx.destination);
    droneOsc.start();
  }
  return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const SoundSystem = {
  init: initAudio,
  updateDrone: (ballSpeed: number, proximity: number = 0, isFPS: boolean = false) => {
    if (droneOsc && audioCtx) {
      const targetFreq = isFPS ? 30 : (35 + (ballSpeed * 2) + (proximity * 40));
      droneOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.2);
    }
  },
  playShoot: (level: number) => {
    playTone(level === 3 ? 60 : 600, level === 3 ? 'sawtooth' : 'square', 0.15, 0.15);
  },
  playProjectileHit: () => {
    const ctx = initAudio();
    if (!ctx || !noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  },
  playPlayerHit: () => playTone(50, 'sawtooth', 0.4, 0.3),
  playEnemyHit: () => playTone(120, 'square', 0.1, 0.1),
  playScorePlayer: () => [523, 659, 783].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3, 0.1), i * 100)),
  playScoreEnemy: () => [392, 329, 261].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3, 0.1), i * 100)),
  playWallHit: () => playTone(200, 'sine', 0.05, 0.05),
  playLevelUp: () => playTone(880, 'triangle', 0.8, 0.1),
  playGameOver: () => playTone(100, 'sawtooth', 1.0, 0.2),
  playUiHover: () => playTone(1500, 'sine', 0.02, 0.02),
  playUiClick: () => playTone(1000, 'square', 0.08, 0.05),
  playUpgradeSelect: () => [800, 1200].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.1, 0.1), i * 50)),
  playJump: () => playTone(300, 'sine', 0.2, 0.1),
  playLand: () => playTone(150, 'sine', 0.05, 0.05),
  playFootstep: () => playTone(100, 'sine', 0.02, 0.01),
};