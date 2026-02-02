import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export interface LocalTranscriptionResult {
  text: string;
  words?: Array<{ word: string; start: number; end: number }>;
  segments?: Array<{ id: number; text: string; start: number; end: number }>;
  language?: string;
  duration?: number;
}

class LocalSttService {
  private whisperBin = process.env.WHISPER_CPP_BIN || '';
  private whisperModel = process.env.WHISPER_CPP_MODEL || '';
  private ffmpegBin = process.env.FFMPEG_BIN || 'ffmpeg';

  async transcribe(
    audioBuffer: Buffer,
    options: { filename?: string; mimeType?: string } = {}
  ): Promise<LocalTranscriptionResult> {
    if (!this.whisperBin || !this.whisperModel) {
      throw new Error('Local STT is not configured. Set WHISPER_CPP_BIN and WHISPER_CPP_MODEL.');
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hiresense-stt-'));
    const inputExt = this.getExtension(options.filename, options.mimeType);
    const inputPath = path.join(tempDir, `input.${inputExt}`);
    const wavPath = path.join(tempDir, 'input.wav');
    const outputPrefix = path.join(tempDir, 'output');
    const outputTxt = `${outputPrefix}.txt`;

    try {
      await fs.writeFile(inputPath, audioBuffer);

      // Convert to 16kHz mono WAV for whisper.cpp if not already wav
      if (inputExt !== 'wav') {
        await this.runCommand(this.ffmpegBin, [
          '-y',
          '-i',
          inputPath,
          '-ar',
          '16000',
          '-ac',
          '1',
          wavPath,
        ]);
      } else {
        await fs.copyFile(inputPath, wavPath);
      }

      await this.runCommand(this.whisperBin, [
        '-m',
        this.whisperModel,
        '-f',
        wavPath,
        '-otxt',
        '-of',
        outputPrefix,
        '-nt',
      ]);

      const text = (await fs.readFile(outputTxt, 'utf-8')).trim();

      return {
        text,
        words: [],
        segments: [],
      };
    } finally {
      await this.safeRm(tempDir);
    }
  }

  private getExtension(filename?: string, mimeType?: string): string {
    if (filename) {
      const ext = path.extname(filename).replace('.', '').toLowerCase();
      if (ext) return ext;
    }

    if (mimeType) {
      if (mimeType.includes('audio/wav')) return 'wav';
      if (mimeType.includes('audio/webm')) return 'webm';
      if (mimeType.includes('audio/mp4')) return 'mp4';
      if (mimeType.includes('audio/mpeg')) return 'mp3';
    }

    return 'webm';
  }

  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`));
        }
      });
    });
  }

  private async safeRm(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

export const localSttService = new LocalSttService();
export default localSttService;
