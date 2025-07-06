// Dynamic import for opus-recorder since it doesn't have proper ES6 module support

export interface OpusConfig {
  bitrate: number;
  complexity: number;
  frameSize: number;
  channels: number;
}

export class OpusEncoder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private config: OpusConfig;
  private opusRecorder: any = null;
  private rawAudioChunks: Float32Array[] = [];
  private compressedAudioData: Uint8Array | null = null;

  constructor(config: OpusConfig) {
    this.config = config;
  }

  async initialize(config: OpusConfig): Promise<void> {
    // Store config for later use
    this.config = config;
    
    try {
      // Dynamic import for opus-recorder
      const OpusRecorderModule = await import('opus-recorder');
      const OpusRecorder = OpusRecorderModule.default || OpusRecorderModule;
      
      // Initialize the real Opus recorder with basic configuration
      this.opusRecorder = new OpusRecorder({
        encoderPath: '/opus-recorder/encoderWorker.min.js',
        encoderApplication: 2049, // OPUS_APPLICATION_VOIP
        encoderBitrate: config.bitrate * 1000, // Convert kbps to bps
        encoderComplexity: config.complexity,
        encoderFrameSize: config.frameSize,
        encoderSampleRate: 48000,
        maxFramesPerPage: 40
      });
      
      console.log('Opus WASM encoder initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Opus WASM encoder:', error);
      throw new Error(`Opus WASM initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async startRecording(): Promise<void> {
    if (!this.opusRecorder) {
      throw new Error('Opus encoder not initialized. Call initialize() first.');
    }

    try {
      this.rawAudioChunks = [];
      this.isRecording = true;

      // Set up data callback to capture compressed audio
      this.compressedAudioData = null;
      this.opusRecorder.ondataavailable = (data: Uint8Array) => {
        this.compressedAudioData = data;
      };

      // Start the real Opus recorder (it will handle getting the media stream)
      await this.opusRecorder.start();
      console.log('Opus WASM recording started');

      // Set up separate audio context for raw audio capture and visualization
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Load the AudioWorklet module for raw audio capture
      await this.audioContext.audioWorklet.addModule('/audioProcessor.js');

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      // Handle audio data from the worklet (for raw audio and visualization)
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audioData' && this.isRecording) {
          this.rawAudioChunks.push(new Float32Array(event.data.data));
        }
      };

      source.connect(workletNode);
      // Don't connect to destination to avoid feedback loop
    } catch (error) {
      console.error('Failed to start Opus WASM recording:', error);
      throw new Error(`Opus WASM recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopRecording(): Promise<{ rawAudio: Float32Array; compressedAudio: Uint8Array; duration: number }> {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }

    if (!this.opusRecorder) {
      throw new Error('Opus encoder not available');
    }

    this.isRecording = false;

    try {
      // Stop the real Opus recorder and wait for completion
      await this.opusRecorder.stop();
      
      // Get the compressed audio data from the callback
      const compressedAudio = this.compressedAudioData || new Uint8Array(0);
      console.log('Real Opus WASM encoding completed. Size:', compressedAudio.length, 'bytes');

      // Stop the media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Combine all raw audio chunks for visualization and playback
      const totalSamples = this.rawAudioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const rawAudio = new Float32Array(totalSamples);
      let offset = 0;
      
      for (const chunk of this.rawAudioChunks) {
        rawAudio.set(chunk, offset);
        offset += chunk.length;
      }

      const duration = totalSamples / 48000; // 48kHz sample rate

      return {
        rawAudio,
        compressedAudio,
        duration
      };
    } catch (error) {
      console.error('Failed to stop Opus WASM recording:', error);
      throw new Error(`Opus WASM stop recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  destroy(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.opusRecorder) {
      // opus-recorder uses close() method, not destroy()
      this.opusRecorder.close();
      this.opusRecorder = null;
    }
    this.rawAudioChunks = [];
    this.isRecording = false;
  }
} 