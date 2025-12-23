// Audio Engine - Procedural Sound Synthesis

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  // Pre-generate noise buffer for explosions/impacts
  if (!noiseBuffer && audioCtx) {
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return audioCtx;
};

// Helper: Standard Envelope Oscillator
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

// Helper: Noise Burst
const playNoise = (duration: number, vol: number = 0.1) => {
  const ctx = initAudio();
  if (!ctx || !noiseBuffer) return;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  // Lowpass filter to make it sound like a dull thud/explosion rather than white noise hiss
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

  playPlayerHit: () => {
    // Clear, high-tech ping
    playTone(880 + Math.random() * 50, 'sine', 0.1, 0.15); 
    // Subtle overtone
    playTone(1760, 'triangle', 0.05, 0.05);
  },

  playEnemyHit: () => {
    // Lower, robotic square wave
    playTone(220 + Math.random() * 20, 'square', 0.1, 0.1); 
  },

  playWallHit: () => {
    // Short mechanical thud
    playNoise(0.05, 0.1);
    playTone(100, 'triangle', 0.05, 0.2);
  },

  playScorePlayer: () => {
    const ctx = initAudio();
    if (!ctx) return;
    // Positive Arpeggio
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.type = 'sine';
       osc.frequency.setValueAtTime(freq, now + i * 0.05);
       gain.gain.setValueAtTime(0.1, now + i * 0.05);
       gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
       osc.connect(gain);
       gain.connect(ctx.destination);
       osc.start(now + i * 0.05);
       osc.stop(now + i * 0.05 + 0.3);
    });
  },

  playScoreEnemy: () => {
    const ctx = initAudio();
    if (!ctx) return;
    // Dissonant/Negative sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  },

  playLevelUp: () => {
    const ctx = initAudio();
    if (!ctx) return;
    // Long Sweeping Riser
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 1.5);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  },

  playGameOver: () => {
    const ctx = initAudio();
    if (!ctx) return;
    // Power down effect
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  },

  playUiHover: () => {
    // Very short high blip
    playTone(2000, 'sine', 0.03, 0.02);
  },

  playUiClick: () => {
    // Confirm sound
    playTone(1200, 'square', 0.1, 0.05);
  },
  
  playUpgradeSelect: () => {
    // Tech confirm
    playTone(800, 'square', 0.1, 0.1);
    setTimeout(() => playTone(1200, 'square', 0.1, 0.1), 100);
  }
};
