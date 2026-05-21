// Minimal typings for opus-recorder v8 — based on the actual library source,
// not the README (which has typos like `encoderBitrate`).

declare module 'opus-recorder' {
  export interface RecorderOptions {
    bufferLength?: number;
    encoderApplication?: number;
    encoderBitRate?: number;          // bits/sec (NOT `encoderBitrate` — case-sensitive).
    encoderComplexity?: number;       // 0..10
    encoderFrameSize?: number;        // ms
    encoderPath?: string;             // path to encoderWorker.min.js
    encoderSampleRate?: 8000 | 12000 | 16000 | 24000 | 48000;
    maxFramesPerPage?: number;
    mediaTrackConstraints?: boolean | MediaTrackConstraints;
    monitorGain?: number;
    numberOfChannels?: 1 | 2;
    recordingGain?: number;
    resampleQuality?: number;
    streamPages?: boolean;
    wavBitDepth?: 8 | 16 | 24 | 32;
    sourceNode?: { context: AudioContext | null };
    originalSampleRateOverride?: number;
  }

  export default class Recorder {
    constructor(options?: RecorderOptions);

    static isRecordingSupported(): boolean;
    static readonly version: string;

    readonly state: 'inactive' | 'loading' | 'recording' | 'paused';
    readonly encodedSamplePosition: number;
    readonly config: Required<RecorderOptions>;

    start(): Promise<void>;
    stop(): Promise<void>;
    pause(flush?: boolean): Promise<void>;
    resume(): void;
    close(): Promise<void>;
    setRecordingGain(gain: number): void;
    setMonitorGain(gain: number): void;

    /** Called once at stop time with the complete OGG-Opus bytes
     *  (when `streamPages` is false; default). */
    ondataavailable: (data: Uint8Array) => void;
    onpause: () => void;
    onresume: () => void;
    onstart: () => void;
    onstop: () => void;
  }
}
