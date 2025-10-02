let audioContext: AudioContext | null = null;
let isMusicPlaying = false;
let musicInterval: number | null = null;
let musicOscillator: OscillatorNode | null = null;
let musicGainNode: GainNode | null = null;

// A minor pentatonic scale for a pleasant, ambient feel
const notes = [220.00, 261.63, 293.66, 329.63, 392.00]; // A3, C4, D4, E4, G4
let currentNoteIndex = 0;


const initializeAudio = () => {
  if (typeof window !== 'undefined' && !audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser");
    }
  }
};

/**
 * Ensures the AudioContext is initialized and resumes it if suspended.
 * This should be called after a user interaction (e.g., a button click).
 */
export const ensureAudioContext = () => {
    if (!audioContext) {
        initializeAudio();
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.error("Could not resume audio context:", e));
    }
}

/**
 * Plays a short, procedurally generated bounce sound.
 * @param volume - The volume of the sound (0.0 to 1.0).
 * @param frequency - The pitch of the sound in Hz.
 */
export const playBounceSound = (volume: number = 0.3, frequency: number = 440) => {
  if (!audioContext || audioContext.state !== 'running') {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Sound parameters
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gainNode.gain.setValueAtTime(Math.max(0, volume), audioContext.currentTime);

  // Quick fade out to create a "boop" sound
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
};

/**
 * Plays a lower, sharper sound for breaking an obstacle.
 * @param volume - The volume of the sound (0.0 to 1.0).
 * @param frequency - The pitch of the sound in Hz.
 */
export const playBreakSound = (volume: number = 0.4, frequency: number = 220) => {
  if (!audioContext || audioContext.state !== 'running') {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Sound parameters
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gainNode.gain.setValueAtTime(Math.max(0, volume), audioContext.currentTime);

  // Faster decay for a "thud" or "break" sound
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
};

const playNextNote = () => {
  if (!audioContext || !musicOscillator || !musicGainNode) return;

  const frequency = notes[currentNoteIndex % notes.length];
  const now = audioContext.currentTime;
  
  // Schedule frequency change
  musicOscillator.frequency.setValueAtTime(frequency, now);

  // Create a small volume envelope to make it sound like a pluck
  musicGainNode.gain.cancelScheduledValues(now);
  musicGainNode.gain.setValueAtTime(0, now);
  musicGainNode.gain.linearRampToValueAtTime(0.08, now + 0.05); // Attack
  musicGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5); // Decay/Release

  currentNoteIndex++;
}

/**
 * Toggles a simple, looping background melody on and off.
 * @returns The new muted state (true if music is now off, false if it's on).
 */
export const toggleBackgroundMusic = (): boolean => {
  ensureAudioContext();
  if (!audioContext) return true; // isMuted = true

  if (isMusicPlaying) {
    if (musicInterval) clearInterval(musicInterval);
    if (musicOscillator) musicOscillator.stop();

    musicInterval = null;
    musicOscillator = null;
    musicGainNode = null;
    isMusicPlaying = false;
    currentNoteIndex = 0;
    return true; // isMuted = true
  } else {
    musicOscillator = audioContext.createOscillator();
    musicGainNode = audioContext.createGain();

    musicOscillator.type = 'triangle'; // A softer, more pleasant tone
    musicOscillator.connect(musicGainNode);
    musicGainNode.connect(audioContext.destination);
    
    musicOscillator.start();
    
    playNextNote(); // Play the first note immediately
    musicInterval = window.setInterval(playNextNote, 600); // Schedule subsequent notes

    isMusicPlaying = true;
    return false; // isMuted = false
  }
};
