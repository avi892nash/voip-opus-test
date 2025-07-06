declare module 'opus-recorder' {
  export interface OpusRecorderOptions {
    encoderPath?: string;
    encoderApplication?: number;
    encoderBitrate?: number;
    encoderComplexity?: number;
    encoderFrameSize?: number;
    encoderChannels?: number;
    encoderSampleRate?: number;
    maxFramesPerPage?: number;
    mediaType?: string;
  }

  export interface OpusRecorderResult {
    data: Uint8Array;
    blob: Blob;
  }

  export default class OpusRecorder {
    constructor(options?: OpusRecorderOptions);
    init(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<OpusRecorderResult>;
    destroy(): void;
  }
} 