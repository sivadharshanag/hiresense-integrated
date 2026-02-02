/**
 * Lip Sync Engine
 * 
 * Maps words and audio timing to viseme (mouth shape) values for realistic lip sync.
 * Approximates phoneme-to-viseme mapping based on word patterns.
 */

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface VisemeFrame {
  time: number;
  visemes: Record<string, number>; // viseme name -> intensity (0-1)
}

// Viseme mapping based on ARKit/Ready Player Me standard
export const VISEME_NAMES = {
  SILENCE: 'viseme_sil',
  AA: 'viseme_aa',      // 'ah' as in 'father'
  E: 'viseme_E',        // 'eh' as in 'bed'
  I: 'viseme_I',        // 'ee' as in 'see'
  O: 'viseme_O',        // 'oh' as in 'go'
  U: 'viseme_U',        // 'oo' as in 'boot'
  PP: 'viseme_PP',      // 'p', 'b', 'm'
  FF: 'viseme_FF',      // 'f', 'v'
  TH: 'viseme_TH',      // 'th'
  DD: 'viseme_DD',      // 'd', 't', 'n'
  KK: 'viseme_kk',      // 'k', 'g'
  CH: 'viseme_CH',      // 'ch', 'sh', 'j'
  SS: 'viseme_SS',      // 's', 'z'
  NN: 'viseme_nn',      // 'n', 'l'
  RR: 'viseme_RR',      // 'r'
} as const;

/**
 * Map word to dominant viseme based on vowel and consonant sounds
 * This is a simplified phonetic approximation
 */
function wordToViseme(word: string): string {
  const w = word.toLowerCase().trim();
  
  // Handle common patterns
  
  // M, B, P sounds (lips closed)
  if (/^[mbp]|[mbp]$/i.test(w)) return VISEME_NAMES.PP;
  
  // F, V sounds (lips on teeth)
  if (/^[fv]|[fv]$/i.test(w)) return VISEME_NAMES.FF;
  
  // TH sounds
  if (w.includes('th')) return VISEME_NAMES.TH;
  
  // S, Z sounds
  if (/^[sz]|[sz]$/i.test(w) || w.includes('ss')) return VISEME_NAMES.SS;
  
  // CH, SH, J sounds
  if (w.includes('ch') || w.includes('sh') || /^j/i.test(w)) return VISEME_NAMES.CH;
  
  // R sounds
  if (/^r|r$/i.test(w)) return VISEME_NAMES.RR;
  
  // K, G sounds
  if (/^[kg]|[kg]$/i.test(w)) return VISEME_NAMES.KK;
  
  // D, T, N sounds
  if (/^[dtn]|[dtn]$/i.test(w)) return VISEME_NAMES.DD;
  
  // L, N sounds
  if (/^[ln]|[ln]$/i.test(w)) return VISEME_NAMES.NN;
  
  // Vowel sounds (check dominant vowel)
  const vowels = w.match(/[aeiou]+/gi);
  if (vowels && vowels.length > 0) {
    const dominantVowel = vowels[0].toLowerCase();
    
    if (/a[ahrw]?|ah/i.test(dominantVowel)) return VISEME_NAMES.AA;
    if (/ee?|ea|ie/i.test(dominantVowel)) return VISEME_NAMES.I;
    if (/o[orw]?|oa|ow/i.test(dominantVowel)) return VISEME_NAMES.O;
    if (/oo|u[ue]?/i.test(dominantVowel)) return VISEME_NAMES.U;
    if (/e[adn]?/i.test(dominantVowel)) return VISEME_NAMES.E;
  }
  
  // Default to AA (neutral mouth slightly open)
  return VISEME_NAMES.AA;
}

export function getVisemeForWord(word: string): string {
  return wordToViseme(word);
}

/**
 * Generate viseme animation frames from word timestamps
 */
export function generateVisemeFrames(
  wordTimestamps: WordTimestamp[],
  fps: number = 30
): VisemeFrame[] {
  if (!wordTimestamps || wordTimestamps.length === 0) {
    return [];
  }

  const frames: VisemeFrame[] = [];
  const frameDuration = 1 / fps;

  // Get total duration
  const lastWord = wordTimestamps[wordTimestamps.length - 1];
  const totalDuration = lastWord.end;

  // Generate frames for each time step
  for (let time = 0; time <= totalDuration; time += frameDuration) {
    const frame = generateFrameAtTime(time, wordTimestamps, frameDuration);
    frames.push(frame);
  }

  return frames;
}

/**
 * Generate a single viseme frame at a specific time
 */
function generateFrameAtTime(
  time: number,
  wordTimestamps: WordTimestamp[],
  frameDuration: number
): VisemeFrame {
  const visemes: Record<string, number> = {};

  // Find the word(s) being spoken at this time
  const currentWords = wordTimestamps.filter(
    w => time >= w.start && time <= w.end
  );

  if (currentWords.length === 0) {
    // Silence
    visemes[VISEME_NAMES.SILENCE] = 1.0;
    return { time, visemes };
  }

  // For each current word, calculate its viseme contribution
  currentWords.forEach(word => {
    const viseme = wordToViseme(word.word);
    const wordProgress = (time - word.start) / (word.end - word.start);
    
    // Use envelope for smooth transitions
    // Attack (0-20%), sustain (20-80%), release (80-100%)
    let intensity = 1.0;
    
    if (wordProgress < 0.2) {
      // Attack phase - ramp up
      intensity = wordProgress / 0.2;
    } else if (wordProgress > 0.8) {
      // Release phase - ramp down
      intensity = (1.0 - wordProgress) / 0.2;
    }
    
    // Blend with existing viseme if present
    if (visemes[viseme]) {
      visemes[viseme] = Math.max(visemes[viseme], intensity);
    } else {
      visemes[viseme] = intensity;
    }
  });

  // Normalize viseme values
  const totalIntensity = Object.values(visemes).reduce((sum, val) => sum + val, 0);
  if (totalIntensity > 0) {
    Object.keys(visemes).forEach(key => {
      visemes[key] /= totalIntensity;
    });
  }

  return { time, visemes };
}

/**
 * Get viseme values at a specific time (with interpolation)
 */
export function getVisemesAtTime(
  frames: VisemeFrame[],
  time: number
): Record<string, number> {
  if (frames.length === 0) {
    return { [VISEME_NAMES.SILENCE]: 1.0 };
  }

  // Find surrounding frames
  let prevFrame: VisemeFrame | null = null;
  let nextFrame: VisemeFrame | null = null;

  for (let i = 0; i < frames.length; i++) {
    if (frames[i].time <= time) {
      prevFrame = frames[i];
    }
    if (frames[i].time >= time && !nextFrame) {
      nextFrame = frames[i];
      break;
    }
  }

  // If before first frame or after last frame
  if (!prevFrame) return frames[0].visemes;
  if (!nextFrame) return frames[frames.length - 1].visemes;
  
  // If exact match
  if (prevFrame.time === time) return prevFrame.visemes;
  if (nextFrame.time === time) return nextFrame.visemes;

  // Interpolate between frames
  const t = (time - prevFrame.time) / (nextFrame.time - prevFrame.time);
  const interpolated: Record<string, number> = {};

  // Get all viseme keys from both frames
  const allKeys = new Set([
    ...Object.keys(prevFrame.visemes),
    ...Object.keys(nextFrame.visemes),
  ]);

  allKeys.forEach(key => {
    const prevValue = prevFrame!.visemes[key] || 0;
    const nextValue = nextFrame!.visemes[key] || 0;
    interpolated[key] = prevValue + (nextValue - prevValue) * t;
  });

  return interpolated;
}

/**
 * Apply viseme values to Three.js mesh morph targets
 */
export function applyVisemesToMesh(
  mesh: any,
  visemes: Record<string, number>
): void {
  if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
    return;
  }

  // Reset all mouth-related morph targets
  const mouthTargets = [
    'mouthOpen', 'jawOpen', 
    ...Object.values(VISEME_NAMES)
  ];

  mouthTargets.forEach(targetName => {
    const index = mesh.morphTargetDictionary[targetName];
    if (index !== undefined) {
      mesh.morphTargetInfluences[index] = 0;
    }
  });

  // Apply viseme values
  Object.entries(visemes).forEach(([visemeName, intensity]) => {
    const index = mesh.morphTargetDictionary[visemeName];
    if (index !== undefined) {
      mesh.morphTargetInfluences[index] = intensity * 0.8; // Scale down for realism
    }

    // Fallback to generic mouth targets if specific viseme not found
    if (index === undefined && intensity > 0) {
      const mouthOpenIndex = mesh.morphTargetDictionary['mouthOpen'] || 
                              mesh.morphTargetDictionary['jawOpen'];
      if (mouthOpenIndex !== undefined) {
        mesh.morphTargetInfluences[mouthOpenIndex] = Math.max(
          mesh.morphTargetInfluences[mouthOpenIndex] || 0,
          intensity * 0.5
        );
      }
    }
  });
}

/**
 * Lip Sync Engine class for managing lip sync state
 */
export class LipSyncEngine {
  private frames: VisemeFrame[] = [];
  private isPlaying: boolean = false;
  private startTime: number = 0;

  /**
   * Load word timestamps and generate frames
   */
  loadTimestamps(wordTimestamps: WordTimestamp[], fps: number = 30): void {
    this.frames = generateVisemeFrames(wordTimestamps, fps);
  }

  /**
   * Start playback
   */
  start(): void {
    this.isPlaying = true;
    this.startTime = Date.now() / 1000;
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false;
  }

  /**
   * Reset
   */
  reset(): void {
    this.isPlaying = false;
    this.frames = [];
    this.startTime = 0;
  }

  /**
   * Get current visemes based on elapsed time
   */
  getCurrentVisemes(): Record<string, number> {
    if (!this.isPlaying || this.frames.length === 0) {
      return { [VISEME_NAMES.SILENCE]: 1.0 };
    }

    const currentTime = Date.now() / 1000 - this.startTime;
    return getVisemesAtTime(this.frames, currentTime);
  }

  /**
   * Update method to be called in animation loop
   */
  update(meshes: any[]): void {
    if (!this.isPlaying) return;

    const visemes = this.getCurrentVisemes();
    
    meshes.forEach(mesh => {
      applyVisemesToMesh(mesh, visemes);
    });
  }
}
