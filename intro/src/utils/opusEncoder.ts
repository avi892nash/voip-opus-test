export interface OpusConfig {
  bitrate: number;
  complexity: number;
  frameSize: number;
  channels: number;
}

export class OpusEncoder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;
  private config: OpusConfig;

  constructor(config: OpusConfig) {
    this.config = config;
  }

  async initialize(config: OpusConfig): Promise<void> {
    // Store config for later use
    this.config = config;
  }

  async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.audioChunks = [];
      this.isRecording = true;

      // Load the AudioWorklet module
      await this.audioContext.audioWorklet.addModule('/audioProcessor.js');

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      // Handle audio data from the worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audioData' && this.isRecording) {
          this.audioChunks.push(new Float32Array(event.data.data));
        }
      };

      source.connect(workletNode);
      // Don't connect to destination to avoid feedback loop
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<{ rawAudio: Float32Array; compressedAudio: Uint8Array; duration: number }> {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }

    this.isRecording = false;

    // Stop the media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Combine all audio chunks
    const totalSamples = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const rawAudio = new Float32Array(totalSamples);
    let offset = 0;
    
    for (const chunk of this.audioChunks) {
      rawAudio.set(chunk, offset);
      offset += chunk.length;
    }

    const duration = totalSamples / 48000; // 48kHz sample rate

    // Simulate Opus compression with realistic compression ratio based on all config settings
    let baseCompressedSize = Math.floor((this.config.bitrate * duration * 1024) / 8);
    
    // Apply complexity factor (higher complexity = better compression but larger file)
    const complexityFactor = 1 + (this.config.complexity - 5) * 0.1; // 0.5 to 1.5
    baseCompressedSize = Math.floor(baseCompressedSize * complexityFactor);
    
    // Apply frame size factor (smaller frames = more overhead)
    const frameSizeFactor = 1 + (20 - this.config.frameSize) * 0.02; // 0.6 to 1.4
    baseCompressedSize = Math.floor(baseCompressedSize * frameSizeFactor);
    
    // Apply channel factor (stereo = 2x size)
    const channelFactor = this.config.channels;
    baseCompressedSize = Math.floor(baseCompressedSize * channelFactor);
    
    const compressedAudio = new Uint8Array(baseCompressedSize);

    // Fill with realistic compressed data pattern based on quality settings
    const qualityFactor = this.config.bitrate / 128; // 0.0625 to 1.0
    for (let i = 0; i < baseCompressedSize; i++) {
      // Higher quality = more structured data, lower quality = more random
      if (qualityFactor > 0.5) {
        compressedAudio[i] = Math.floor(Math.sin(i * 0.1) * 128 + 128);
      } else {
        compressedAudio[i] = Math.floor(Math.random() * 256);
      }
    }

    return {
      rawAudio,
      compressedAudio,
      duration
    };
  }

  destroy(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioChunks = [];
    this.isRecording = false;
  }
} 