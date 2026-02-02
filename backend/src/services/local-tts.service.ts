import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

export interface LocalTtsResult {
  audioBuffer: Buffer;
  contentType: string;
}

class LocalTtsService {
  private piperBin = process.env.PIPER_BIN || '';
  private piperModel = process.env.PIPER_MODEL || '';
  private piperConfig = process.env.PIPER_CONFIG || '';

  async textToSpeech(text: string): Promise<LocalTtsResult> {
    if (!this.piperBin || !this.piperModel) {
      throw new Error('Local TTS is not configured. Set PIPER_BIN and PIPER_MODEL.');
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hiresense-tts-'));
    const outputPath = path.join(tempDir, `piper-${randomUUID()}.wav`);

    try {
      const args = ['-m', this.piperModel, '-f', outputPath];
      if (this.piperConfig) {
        args.push('--config', this.piperConfig);
      }

      await this.runCommandWithInput(this.piperBin, args, text);

      const audioBuffer = await fs.readFile(outputPath);
      return {
        audioBuffer,
        contentType: 'audio/wav',
      };
    } finally {
      await this.safeRm(tempDir);
    }
  }

  private runCommandWithInput(command: string, args: string[], input: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
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

      child.stdin.write(input);
      child.stdin.end();
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

export const localTtsService = new LocalTtsService();
export default localTtsService;
