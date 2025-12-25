
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
  updateDrone: (ballSpeed: number, isFPS: boolean = false) => {
    if (droneOsc && audioCtx) {
      const targetFreq = isFPS ? 30 : (40 + (ballSpeed * 3));
      droneOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.5);
    }
  },
  playShoot: (level: number) => {
    if (level === 3) {
      playTone(100, 'sawtooth', 0.4, 0.3);
      playTone(200, 'square', 0.2, 0.2);
    } else {
      playTone(800 + Math.random() * 200, 'square', 0.08, 0.08);
    }
  },
  playJump: () => {
    playTone(200, 'triangle', 0.2, 0.1);
    playTone(400, 'sine', 0.1, 0.05);
  },
  playLand: () => {
    playNoise(0.05, 0.05);
  },
  playProjectileHit: () => {
    playNoise(0.1, 0.15);
    playTone(300, 'square', 0.05, 0.1);
  },
  playPlayerHit: () => {
    playTone(60, 'sawtooth', 0.3, 0.4); 
    playNoise(0.15, 0.3);
  },
  playEnemyHit: () => {
    playTone(120, 'sawtooth', 0.1, 0.2);
    playNoise(0.05, 0.1);
  },
  playScorePlayer: () => {
    const ctx = initAudio();
    if (!ctx) return;
    [523, 659, 783, 1046].forEach((f, i) => {
        setTimeout(() => playTone(f, 'sine', 0.4, 0.1), i * 100);
    });
  },
  playScoreEnemy: () => {
    const ctx = initAudio();
    if (!ctx) return;
    [392, 329, 261, 196].forEach((f, i) => {
        setTimeout(() => playTone(f, 'sine', 0.4, 0.1), i * 100);
    });
  },
  playWallHit: () => {
    playTone(150, 'sine', 0.05, 0.05);
  },
  playLevelUp: () => {
    playTone(440, 'triangle', 0.6, 0.15);
    setTimeout(() => playTone(880, 'triangle', 0.6, 0.15), 150);
  },
  playGameOver: () => playTone(150, 'sawtooth', 2.0, 0.3),
  playUiHover: () => playTone(1500, 'sine', 0.02, 0.03),
  playUiClick: () => playTone(1200, 'square', 0.06, 0.06),
  playUpgradeSelect: () => {
    playTone(1000, 'square', 0.1, 0.1);
    setTimeout(() => playTone(1600, 'square', 0.1, 0.1), 100);
  }
};
