let audioContext: AudioContext | null = null;
let isMusicPlaying = true;
let musicInterval: number | null = null;
let musicOscillator: OscillatorNode | null = null;
let musicGainNode: GainNode | null = null;

// Buffers for the two separate sound files
let bounceSoundBuffer: AudioBuffer | null = null;
let breakSoundBuffer: AudioBuffer | null = null;


// A minor pentatonic scale for a pleasant, ambient feel
const notes =  [
    // --- Octave 2 ---
    110.00, // A2
    123.47, // B2
    130.81, // C3
    146.83, // D3
    164.81, // E3
    174.61, // F3
    196.00, // G3

    // --- Octave 3 (Your original was mostly in here) ---
    220.00, // A3
    246.94, // B3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    349.23, // F4
    392.00, // G4

    // --- Octave 4 ---
    440.00, // A4
    493.88, // B4
    523.25, // C5
    587.33, // D5
    659.26, // E5
    698.46, // F5
    783.99, // G5

    // --- High A for resolution ---
    880.00  // A5
];
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
 * Loads the two sound files into AudioBuffers.
 * Assumes bounce.mp3 and break.mp3 are in the /public folder.
 */
export const loadSounds = async () => {
  if (!audioContext || (bounceSoundBuffer && breakSoundBuffer)) {
    return; // Already loaded or no audio context
  }

  try {
    // Fetch and decode bounce sound
    const bounceResponse = await fetch('/bounce.mp3');
    const bounceArrayBuffer = await bounceResponse.arrayBuffer();
    bounceSoundBuffer = await audioContext.decodeAudioData(bounceArrayBuffer);

    // Fetch and decode break sound
    const breakResponse = await fetch('/break.mp3');
    const breakArrayBuffer = await breakResponse.arrayBuffer();
    breakSoundBuffer = await audioContext.decodeAudioData(breakArrayBuffer);

    console.log("Custom sound files loaded successfully!");
  } catch (e) {
    console.error("Error loading custom sound files. Make sure 'bounce.mp3' and 'break.mp3' are in a 'public' folder.", e);
  }
};

/**
 * Plays a sound from a loaded AudioBuffer.
 * @param volume - The volume of the sound (0.0 to 1.0).
 * @param buffer - The AudioBuffer to play.
 */
const playSoundFromBuffer = (volume: number, buffer: AudioBuffer | null) => {
  if (!audioContext || audioContext.state !== 'running' || !buffer) {
    return;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(Math.max(0, volume), audioContext.currentTime);

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(0); // Play the sound from the beginning
};


/**
 * Plays the bounce sound from the loaded file.
 */
export const playBounceSound = (volume: number = 0.5) => {
  playSoundFromBuffer(volume, bounceSoundBuffer);
};

/**
 * Plays the break sound from the loaded file.
 */
export const playBreakSound = (volume: number = 0.6) => {
  playSoundFromBuffer(volume, breakSoundBuffer);
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
