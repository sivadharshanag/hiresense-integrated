/**
 * SyncManager - Synchronizes audio playback, lip sync, text streaming, and avatar gestures
 * 
 * Coordinates the timeline between:
 * - Audio playback (currentTime)
 * - Lip sync viseme frames (from LipSyncEngine)
 * - Streaming text display (word-by-word reveal)
 * - Avatar gesture states (idle, speaking, listening)
 */

import { generateVisemeFrames, getVisemesAtTime, WordTimestamp, VisemeFrame } from './lipSyncEngine';
import React from 'react';

const getMediaErrorMessage = (error: MediaError | null): string => {
  if (!error) return 'Audio playback error: Unknown error';
  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Audio playback was aborted.';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'Network error while loading audio.';
    case MediaError.MEDIA_ERR_DECODE:
      return 'Audio decoding failed. The audio file may be corrupted.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'Audio format not supported by your browser.';
    default:
      return error.message || 'Audio playback error.';
  }
};

/**
 * Simple browser-compatible EventEmitter
 */
class EventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }

  removeAllListeners(): void {
    this.events = {};
  }
}

export interface SyncedSpeechConfig {
  text: string;
  audioUrl: string;
  wordTimestamps: WordTimestamp[];
  onWordSpoken?: (word: string, index: number) => void;
  onVisemeUpdate?: (visemes: VisemeFrame['visemes']) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface StreamedWord {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isActive: boolean;
}

type SyncState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export class SyncManager extends EventEmitter {
  private audio: HTMLAudioElement | null = null;
  private state: SyncState = 'idle';
  private currentTime: number = 0;
  private duration: number = 0;
  private wordTimestamps: WordTimestamp[] = [];
  private visemeFrames: VisemeFrame[] = [];
  private animationFrameId: number | null = null;
  private lastWordIndex: number = -1;
  private config: SyncedSpeechConfig | null = null;

  constructor() {
    super();
  }

  /**
   * Start synchronized speech playback
   */
  async startSpeech(config: SyncedSpeechConfig): Promise<void> {
    try {
      // Clean up any previous session
      this.stop();

      this.config = config;
      this.state = 'loading';
      this.wordTimestamps = config.wordTimestamps;
      this.lastWordIndex = -1;

      // Generate viseme frames from word timestamps
      this.visemeFrames = generateVisemeFrames(config.wordTimestamps);

      // Create and configure audio element
      this.audio = new Audio(config.audioUrl);
      this.audio.preload = 'auto';

      // Set up audio event listeners
      this.setupAudioListeners();

      // Load and play audio
      await this.audio.load();
      await this.audio.play();

      this.state = 'playing';
      this.emit('started');

      // Start animation loop for sync updates
      this.startAnimationLoop();
    } catch (error) {
      this.state = 'error';
      const err = error instanceof Error ? error : new Error('Failed to start speech');
      this.emit('error', err);
      this.config?.onError?.(err);
    }
  }

  /**
   * Setup audio element event listeners
   */
  private setupAudioListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio?.duration || 0;
      this.emit('durationChanged', this.duration);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio?.currentTime || 0;
      this.emit('timeUpdate', this.currentTime);
    });

    this.audio.addEventListener('ended', () => {
      this.handleComplete();
    });

    this.audio.addEventListener('error', () => {
      const error = new Error(getMediaErrorMessage(this.audio?.error || null));
      this.state = 'error';
      this.emit('error', error);
      this.config?.onError?.(error);
    });
  }

  /**
   * Start animation loop for synchronized updates
   */
  private startAnimationLoop(): void {
    const update = () => {
      if (this.state !== 'playing' || !this.audio) {
        return;
      }

      const currentTime = this.audio.currentTime;
      this.currentTime = currentTime;

      // Update visemes for lip sync
      const visemes = getVisemesAtTime(this.visemeFrames, currentTime);
      if (visemes) {
        this.emit('visemeUpdate', visemes);
        this.config?.onVisemeUpdate?.(visemes);
      }

      // Update current word for streaming text
      const currentWord = this.getCurrentWord(currentTime);
      if (currentWord) {
        this.emit('wordUpdate', currentWord);
        
        // Trigger onWordSpoken callback when word changes
        if (currentWord.index !== this.lastWordIndex) {
          this.lastWordIndex = currentWord.index;
          this.config?.onWordSpoken?.(currentWord.word, currentWord.index);
        }
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  /**
   * Stop animation loop
   */
  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get the current word being spoken at a specific time
   */
  getCurrentWord(time: number): StreamedWord | null {
    if (!this.wordTimestamps.length) return null;

    for (let i = 0; i < this.wordTimestamps.length; i++) {
      const word = this.wordTimestamps[i];
      if (time >= word.start && time <= word.end) {
        return {
          word: word.word,
          index: i,
          startTime: word.start,
          endTime: word.end,
          isActive: true,
        };
      }
    }

    return null;
  }

  /**
   * Get all words up to current time (for cumulative text display)
   */
  getSpokenWords(time: number = this.currentTime): StreamedWord[] {
    return this.wordTimestamps
      .filter(word => word.start <= time)
      .map((word, index) => ({
        word: word.word,
        index,
        startTime: word.start,
        endTime: word.end,
        isActive: time >= word.start && time <= word.end,
      }));
  }

  /**
   * Get all words (for complete text display)
   */
  getAllWords(): StreamedWord[] {
    return this.wordTimestamps.map((word, index) => ({
      word: word.word,
      index,
      startTime: word.start,
      endTime: word.end,
      isActive: this.currentTime >= word.start && this.currentTime <= word.end,
    }));
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audio && this.state === 'playing') {
      this.audio.pause();
      this.state = 'paused';
      this.stopAnimationLoop();
      this.emit('paused');
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.audio && this.state === 'paused') {
      try {
        await this.audio.play();
        this.state = 'playing';
        this.startAnimationLoop();
        this.emit('resumed');
      } catch (error) {
        this.state = 'error';
        const err = error instanceof Error ? error : new Error('Failed to resume');
        this.emit('error', err);
        this.config?.onError?.(err);
      }
    }
  }

  /**
   * Stop playback completely
   */
  stop(): void {
    this.stopAnimationLoop();

    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = '';
      this.audio = null;
    }

    this.state = 'stopped';
    this.currentTime = 0;
    this.lastWordIndex = -1;
    this.emit('stopped');
  }

  /**
   * Handle playback completion
   */
  private handleComplete(): void {
    this.stopAnimationLoop();
    this.state = 'idle';
    this.emit('completed');
    this.config?.onComplete?.();
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.duration));
    }
  }

  /**
   * Get current state
   */
  getState(): SyncState {
    return this.state;
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.state === 'playing';
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.state === 'paused';
  }

  /**
   * Check if stopped/idle
   */
  isStopped(): boolean {
    return this.state === 'stopped' || this.state === 'idle';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
    this.config = null;
    this.wordTimestamps = [];
    this.visemeFrames = [];
  }
}

/**
 * Hook-friendly singleton instance
 */
let globalSyncManager: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!globalSyncManager) {
    globalSyncManager = new SyncManager();
  }
  return globalSyncManager;
}

/**
 * React hook for using SyncManager
 */
export function useSyncManager() {
  const [syncManager] = React.useState(() => getSyncManager());
  
  React.useEffect(() => {
    return () => {
      // Don't destroy on unmount as it might be shared
      // syncManager.destroy();
    };
  }, [syncManager]);

  return syncManager;
}

// Export for direct imports
export default SyncManager;
