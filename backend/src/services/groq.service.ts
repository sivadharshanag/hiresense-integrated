/**
 * Groq Service with API Key Rotation and Fallback
 * 
 * Provides LLM (Llama), STT (Whisper), and TTS (Orpheus) capabilities
 * with automatic key rotation and fallback handling.
 */

import dotenv from 'dotenv';
import Groq from 'groq-sdk';

// Ensure environment variables are loaded before accessing Groq keys
dotenv.config();

// Word timestamp interface from Whisper
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

// Segment timestamp interface
export interface SegmentTimestamp {
  id: number;
  text: string;
  start: number;
  end: number;
}

// Transcription result interface
export interface TranscriptionResult {
  text: string;
  words?: WordTimestamp[];
  segments?: SegmentTimestamp[];
  language?: string;
  duration?: number;
}

// TTS voice types (Orpheus English model)
export type OrpheusVoice = 'autumn' | 'diana' | 'hannah' | 'austin' | 'daniel' | 'troy';

// TTS result interface
export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
}

// Chat message interface
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Chat completion result
export interface ChatCompletionResult {
  content: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// API key status tracking
interface KeyStatus {
  key: string;
  errorCount: number;
  lastError?: Date;
  lastSuccess?: Date;
  isRateLimited: boolean;
  rateLimitResetAt?: Date;
}

class GroqService {
  private keyStatuses: KeyStatus[] = [];
  private currentKeyIndex: number = 0;
  private readonly maxErrorsBeforeSkip = 3;
  private readonly rateLimitCooldownMs = 60000; // 1 minute cooldown for rate limited keys

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys(): void {
    // Load all Groq API keys from environment
    const keyEnvNames = [
      'GROQ_API_KEY_1',
      'GROQ_API_KEY_2', 
      'GROQ_API_KEY_3',
      'GROQ_API_KEY_4',
      'GROQ_API_KEY_5',
      'GROQ_API_KEY_6',
    ];

    for (const envName of keyEnvNames) {
      const key = process.env[envName];
      if (key && key.startsWith('gsk_')) {
        this.keyStatuses.push({
          key,
          errorCount: 0,
          isRateLimited: false,
        });
      }
    }

    // Fallback to single GROQ_API_KEY if no numbered keys
    if (this.keyStatuses.length === 0) {
      const singleKey = process.env.GROQ_API_KEY;
      if (singleKey && singleKey.startsWith('gsk_')) {
        this.keyStatuses.push({
          key: singleKey,
          errorCount: 0,
          isRateLimited: false,
        });
      }
    }

    if (this.keyStatuses.length === 0) {
      console.warn('⚠️ No valid Groq API keys found. Virtual interview features will be limited.');
    } else {
      console.log(`✅ Groq Service initialized with ${this.keyStatuses.length} API key(s)`);
    }
  }

  /**
   * Get the next available API key, skipping rate-limited or error-prone keys
   */
  private getNextAvailableKey(): KeyStatus | null {
    const now = new Date();
    const totalKeys = this.keyStatuses.length;
    
    if (totalKeys === 0) return null;

    // Try each key starting from current index
    for (let i = 0; i < totalKeys; i++) {
      const index = (this.currentKeyIndex + i) % totalKeys;
      const keyStatus = this.keyStatuses[index];

      // Check if rate limit has expired
      if (keyStatus.isRateLimited && keyStatus.rateLimitResetAt) {
        if (now >= keyStatus.rateLimitResetAt) {
          keyStatus.isRateLimited = false;
          keyStatus.rateLimitResetAt = undefined;
          keyStatus.errorCount = 0;
        }
      }

      // Skip if still rate limited
      if (keyStatus.isRateLimited) continue;

      // Skip if too many errors (but allow retry after cooldown)
      if (keyStatus.errorCount >= this.maxErrorsBeforeSkip) {
        if (keyStatus.lastError && (now.getTime() - keyStatus.lastError.getTime()) < this.rateLimitCooldownMs) {
          continue;
        }
        // Reset error count after cooldown
        keyStatus.errorCount = 0;
      }

      this.currentKeyIndex = index;
      return keyStatus;
    }

    // If all keys are problematic, reset the first one and use it
    console.warn('⚠️ All Groq API keys have issues. Resetting first key.');
    this.keyStatuses[0].errorCount = 0;
    this.keyStatuses[0].isRateLimited = false;
    this.currentKeyIndex = 0;
    return this.keyStatuses[0];
  }

  /**
   * Create a Groq client with the current API key
   */
  private createClient(keyStatus: KeyStatus): Groq {
    return new Groq({ apiKey: keyStatus.key });
  }

  /**
   * Handle API errors and update key status
   */
  private handleError(keyStatus: KeyStatus, error: any): void {
    keyStatus.errorCount++;
    keyStatus.lastError = new Date();

    // Check for rate limit error
    if (error?.status === 429 || error?.message?.includes('rate_limit') || error?.message?.includes('quota')) {
      keyStatus.isRateLimited = true;
      // Try to parse retry-after header or use default cooldown
      const retryAfter = error?.headers?.['retry-after'];
      const cooldownMs = retryAfter ? parseInt(retryAfter) * 1000 : this.rateLimitCooldownMs;
      keyStatus.rateLimitResetAt = new Date(Date.now() + cooldownMs);
      console.warn(`⚠️ Groq API key rate limited. Will retry after ${cooldownMs}ms`);
    }

    // Move to next key
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keyStatuses.length;
  }

  /**
   * Handle successful API call
   */
  private handleSuccess(keyStatus: KeyStatus): void {
    keyStatus.lastSuccess = new Date();
    keyStatus.errorCount = 0;
    keyStatus.isRateLimited = false;
  }

  /**
   * Execute an operation with automatic key rotation and fallback
   */
  private async executeWithFallback<T>(
    operation: (client: Groq) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const totalKeys = this.keyStatuses.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const keyStatus = this.getNextAvailableKey();
      
      if (!keyStatus) {
        throw new Error('No Groq API keys available');
      }

      try {
        const client = this.createClient(keyStatus);
        const result = await operation(client);
        this.handleSuccess(keyStatus);
        return result;
      } catch (error: any) {
        console.error(`❌ Groq ${operationName} failed (key ${this.currentKeyIndex + 1}):`, error.message);
        this.handleError(keyStatus, error);
        lastError = error;
        
        // Wait a bit before trying next key
        await this.sleep(100 * (attempt + 1));
      }
    }

    throw lastError || new Error(`All Groq API keys failed for ${operationName}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.keyStatuses.length > 0;
  }

  /**
   * Get service status
   */
  getStatus(): { totalKeys: number; availableKeys: number; currentKeyIndex: number } {
    const availableKeys = this.keyStatuses.filter(ks => 
      !ks.isRateLimited && ks.errorCount < this.maxErrorsBeforeSkip
    ).length;
    
    return {
      totalKeys: this.keyStatuses.length,
      availableKeys,
      currentKeyIndex: this.currentKeyIndex,
    };
  }

  // ==================== LLM (Chat Completion) ====================

  /**
   * Generate chat completion using Llama model
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      stream?: boolean;
    } = {}
  ): Promise<ChatCompletionResult> {
    const {
      model = 'llama-3.3-70b-versatile',
      temperature = 0.7,
      maxTokens = 2048,
      topP = 1,
    } = options;

    return this.executeWithFallback(async (client) => {
      const completion = await client.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
      });

      const choice = completion.choices[0];
      
      return {
        content: choice.message.content || '',
        finishReason: choice.finish_reason || 'stop',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
      };
    }, 'chatCompletion');
  }

  /**
   * Generate streaming chat completion
   */
  async *chatCompletionStream(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      model = 'llama-3.3-70b-versatile',
      temperature = 0.7,
      maxTokens = 2048,
    } = options;

    const keyStatus = this.getNextAvailableKey();
    if (!keyStatus) {
      throw new Error('No Groq API keys available');
    }

    const client = this.createClient(keyStatus);

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }

      this.handleSuccess(keyStatus);
    } catch (error: any) {
      this.handleError(keyStatus, error);
      throw error;
    }
  }

  // ==================== Speech-to-Text (Whisper) ====================

  /**
   * Transcribe audio using Whisper
   */
  async transcribe(
    audioBuffer: Buffer,
    options: {
      filename?: string;
      mimeType?: string;
      model?: string;
      language?: string;
      prompt?: string;
      includeTimestamps?: boolean;
    } = {}
  ): Promise<TranscriptionResult> {
    const {
      filename = 'audio.webm',
      mimeType,
      model = 'whisper-large-v3-turbo',
      language = 'en',
      prompt,
      includeTimestamps = true,
    } = options;

    return this.executeWithFallback(async (client) => {
      // Create a File object from the buffer
      const inferredType = mimeType || (
        filename.endsWith('.wav') ? 'audio/wav' :
        filename.endsWith('.mp4') ? 'audio/mp4' :
        filename.endsWith('.mp3') ? 'audio/mpeg' :
        'audio/webm'
      );

      const file = new File([audioBuffer], filename, { 
        type: inferredType
      });

      const transcription = await client.audio.transcriptions.create({
        file,
        model,
        language,
        prompt,
        response_format: includeTimestamps ? 'verbose_json' : 'json',
        timestamp_granularities: includeTimestamps ? ['word', 'segment'] : undefined,
      });

      // Handle verbose_json response
      const result: TranscriptionResult = {
        text: transcription.text,
      };

      // Extract timestamps if available (verbose_json format)
      if (includeTimestamps && typeof transcription === 'object') {
        const verboseResponse = transcription as any;
        
        if (verboseResponse.words) {
          result.words = verboseResponse.words.map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
          }));
        }

        if (verboseResponse.segments) {
          result.segments = verboseResponse.segments.map((s: any) => ({
            id: s.id,
            text: s.text,
            start: s.start,
            end: s.end,
          }));
        }

        if (verboseResponse.language) {
          result.language = verboseResponse.language;
        }

        if (verboseResponse.duration) {
          result.duration = verboseResponse.duration;
        }
      }

      return result;
    }, 'transcribe');
  }

  // ==================== Text-to-Speech (Orpheus) ====================

  /**
   * Generate speech from text using Orpheus model
   */
  async textToSpeech(
    text: string,
    options: {
      model?: string;
      voice?: OrpheusVoice | string;
      responseFormat?: 'wav' | 'mp3' | 'flac' | 'ogg';
    } = {}
  ): Promise<TTSResult> {
    const {
      model = 'canopylabs/orpheus-v1-english',
      voice = 'troy', // Available: autumn, diana, hannah, austin, daniel, troy
      responseFormat = 'wav', // Only 'wav' is supported by Orpheus
    } = options;

    return this.executeWithFallback(async (client) => {
      const response = await client.audio.speech.create({
        model,
        voice,
        input: text,
        response_format: responseFormat,
      });

      // Get the audio data as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const contentType = responseFormat === 'wav' ? 'audio/wav' :
                         responseFormat === 'mp3' ? 'audio/mpeg' :
                         responseFormat === 'ogg' ? 'audio/ogg' :
                         responseFormat === 'flac' ? 'audio/flac' : 'audio/wav';

      return {
        audioBuffer,
        contentType,
      };
    }, 'textToSpeech');
  }

  // ==================== Convenience Methods ====================

  /**
   * Simple text generation helper
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const result = await this.chatCompletion(messages);
    return result.content;
  }

  /**
   * JSON generation helper with parsing
   */
  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const fullSystemPrompt = (systemPrompt || '') + 
      '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown code blocks, no explanations.';
    
    const result = await this.generateText(prompt, fullSystemPrompt);
    
    // Clean up potential markdown code blocks
    let jsonText = result.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/```$/, '');
    }
    
    return JSON.parse(jsonText.trim());
  }
}

// Export singleton instance
export const groqService = new GroqService();
export default groqService;
