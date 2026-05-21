// Wraps opus-recorder for the educational demo:
//   - records the mic
//   - encodes through Opus (in-browser WASM)
//   - returns the raw PCM captured in parallel via AudioWorklet (for the
//     "original" channel)
//   - returns the encoded OGG-Opus bytes + a Blob (for playback and for
//     re-decoding into the "compressed" channel)
//
// Not used on the live /call page — WebRTC handles Opus natively there.

import Recorder from 'opus-recorder';

export interface OpusConfig {
  bitrate: number;        // kbps
  complexity: number;     // 0..10
  frameSize: number;      // ms (2.5, 5, 10, 20, 40, 60)
  channels: number;       // 1 (mono) or 2 (stereo); narrowed at the recorder call.
}

export interface RecordingResult {
  /** Pre-encoder PCM @ 48 kHz, captured via AudioWorklet. */
  rawAudio: Float32Array;
  /** OGG-Opus bytes — the actual compressed stream. */
  compressedAudio: Uint8Array;
  /** `Blob` ready for playback or `decodeAudioData`. */
  compressedBlob: Blob;
  /** Recording length in seconds. */
  duration: number;
}

const RAW_SAMPLE_RATE = 48000;

export class OpusEncoder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private recorder: Recorder | null = null;
  private config: OpusConfig;
  private rawAudioChunks: Float32Array[] = [];
  private compressedAudio: Uint8Array | null = null;
  private isRecording = false;

  constructor(config: OpusConfig) {
    this.config = config;
  }

  async initialize(config: OpusConfig): Promise<void> {
    this.config = config;
    this.recorder = new Recorder({
      encoderPath: '/opus-recorder/encoderWorker.min.js',
      encoderApplication: 2049,       // OPUS_APPLICATION_AUDIO (full-band).
      encoderBitRate: config.bitrate * 1000,  // ← THE CORRECT OPTION NAME.
      encoderComplexity: config.complexity,
      encoderFrameSize: config.frameSize,
      encoderSampleRate: 48000,
      numberOfChannels: config.channels === 2 ? 2 : 1,
      maxFramesPerPage: 40,
    });
    this.recorder.ondataavailable = (data: Uint8Array) => {
      this.compressedAudio = data;
    };
  }

  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('OpusEncoder.initialize() must be called first.');
    }
    this.rawAudioChunks = [];
    this.compressedAudio = null;
    this.isRecording = true;

    // Start Opus encoding. opus-recorder owns its own mic stream + AudioContext.
    await this.recorder.start();

    // In parallel, capture raw PCM via an AudioWorklet on a SEPARATE mic
    // stream — this gives us the pre-encoder audio for the "original" channel
    // of the comparison visualization without fighting opus-recorder for the
    // mic.
    this.audioContext = new AudioContext({ sampleRate: RAW_SAMPLE_RATE });
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: RAW_SAMPLE_RATE,
        channelCount: this.config.channels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    await this.audioContext.audioWorklet.addModule('/audioProcessor.js');

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

    workletNode.port.onmessage = (event: MessageEvent<{ type: string; data: ArrayBuffer }>) => {
      if (event.data?.type === 'audioData' && this.isRecording) {
        this.rawAudioChunks.push(new Float32Array(event.data.data));
      }
    };

    source.connect(workletNode);
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.recorder || !this.isRecording) {
      throw new Error('Not currently recording.');
    }
    this.isRecording = false;

    // stop() resolves when the encoder has flushed and ondataavailable has fired.
    await this.recorder.stop();

    const compressed = this.compressedAudio ?? new Uint8Array(0);
    const compressedBlob = new Blob([compressed.slice().buffer as ArrayBuffer], {
      type: 'audio/ogg; codecs=opus',
    });

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    // Concatenate the AudioWorklet chunks.
    const totalSamples = this.rawAudioChunks.reduce((s, c) => s + c.length, 0);
    const rawAudio = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of this.rawAudioChunks) {
      rawAudio.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      rawAudio,
      compressedAudio: compressed,
      compressedBlob,
      duration: totalSamples / RAW_SAMPLE_RATE,
    };
  }

  destroy(): void {
    this.isRecording = false;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
    this.audioContext = null;
    if (this.recorder) {
      void this.recorder.close();
      this.recorder = null;
    }
    this.rawAudioChunks = [];
  }
}

/**
 * Decode an OGG-Opus blob to PCM via the browser's native decoder.
 *
 * Chrome and Firefox decode `audio/ogg; codecs=opus` directly. Safari support
 * is uneven — callers should be prepared for this to throw and fall back.
 */
export async function decodeOpusBlob(
  blob: Blob,
  sampleRate: number = RAW_SAMPLE_RATE,
): Promise<{ pcm: Float32Array; channels: number; duration: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate,
  });
  try {
    const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    // Mix down to mono for visualization.
    const ch0 = buf.getChannelData(0);
    const pcm = new Float32Array(ch0.length);
    pcm.set(ch0);
    if (buf.numberOfChannels > 1) {
      const ch1 = buf.getChannelData(1);
      for (let i = 0; i < pcm.length; i++) pcm[i] = (pcm[i] + ch1[i]) * 0.5;
    }
    return { pcm, channels: buf.numberOfChannels, duration: buf.duration };
  } finally {
    void ctx.close();
  }
}
