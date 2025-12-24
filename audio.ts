// Audio Engine - Procedural Sound Synthesis

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  if (!noiseBuffer && audioCtx) {
    const bufferSize = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  if (!droneOsc && audioCtx) {
    droneOsc = audioCtx.createOscillator();
    droneGain = audioCtx.createGain();
    droneOsc.type = 'triangle';
    droneOsc.frequency.value = 40; 
    droneGain.gain.value = 0.05;
    droneOsc.connect(droneGain);
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

const playNoise = (duration: number, vol: number = 0.1) => {
  const ctx = initAudio();
  if (!ctx || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + duration);
};

export const SoundSystem = {
  init: initAudio,

  updateDrone: (ballSpeed: number) => {
    if (droneOsc && audioCtx) {
      const targetFreq = 40 + (ballSpeed * 3);
      droneOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.5);
    }
  },

  playShoot: (level: number) => {
    if (level === 3) {
      playTone(100, 'sawtooth', 0.4, 0.3);
      playTone(200, 'sine', 0.2, 0.2);
    } else {
      playTone(800 + Math.random() * 200, 'square', 0.1, 0.1);
    }
  },

  playProjectileHit: () => {
    playNoise(0.1, 0.15);
    playTone(300, 'square', 0.05, 0.1);
  },

  playPlayerHit: () => {
    playTone(600 + Math.random() * 200, 'sine', 0.15, 0.2); 
    playTone(1200, 'triangle', 0.05, 0.05);
  },

  playEnemyHit: () => {
    playTone(180 + Math.random() * 40, 'square', 0.2, 0.12); 
  },

  playWallHit: () => {
    playNoise(0.08, 0.12);
    playTone(80, 'triangle', 0.1, 0.2);
  },

  playScorePlayer: () => {
    const ctx = initAudio();
    if (!ctx) return;
    [523, 659, 783, 1046].forEach((f) => playTone(f, 'sine', 0.4, 0.1));
  },

  playScoreEnemy: () => {
    playTone(140, 'sawtooth', 0.5, 0.2);
    playTone(90, 'sawtooth', 0.6, 0.2);
  },

  playLevelUp: () => {
    playTone(440, 'triangle', 1.0, 0.15);
    setTimeout(() => playTone(880, 'triangle', 1.0, 0.15), 100);
  },

  playGameOver: () => playTone(200, 'sawtooth', 1.5, 0.2),
  playUiHover: () => playTone(1800, 'sine', 0.02, 0.03),
  playUiClick: () => playTone(1000, 'square', 0.08, 0.06),
  playUpgradeSelect: () => {
    playTone(800, 'square', 0.1, 0.1);
    setTimeout(() => playTone(1400, 'square', 0.1, 0.1), 80);
  }
};