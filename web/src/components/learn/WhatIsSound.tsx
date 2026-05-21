import { useEffect, useRef, useState } from 'react';
import Section, { Aside, Cite } from './Section';

/**
 * Section 2 — What is sound, really?
 *
 * Interactive: hold a button to record ~1 second of audio. While holding, we
 * draw the live waveform; afterwards we zoom in to show individual sample
 * dots, the actual numbers, and what 1 minute of raw audio would cost.
 *
 * The whole point: "sound is just a long list of numbers".
 */

const SAMPLE_RATE = 48000;        // typical mic sample rate
const BIT_DEPTH_BYTES = 2;        // 16-bit PCM
const TARGET_DURATION_S = 1.5;    // how long we record on hold

export default function WhatIsSound() {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'done' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [samples, setSamples] = useState<Float32Array | null>(null);
  const [actualSampleRate, setActualSampleRate] = useState(SAMPLE_RATE);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const recordedChunks = useRef<Float32Array[]>([]);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  async function start() {
    setErr(null);
    recordedChunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      setActualSampleRate(ctx.sampleRate);

      await ctx.audioWorklet.addModule('/audioProcessor.js');
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const worklet = new AudioWorkletNode(ctx, 'audio-processor');
      workletNodeRef.current = worklet;
      worklet.port.onmessage = (e: MessageEvent<{ type: string; data: ArrayBuffer }>) => {
        if (e.data?.type === 'audioData') {
          recordedChunks.current.push(new Float32Array(e.data.data));
        }
      };
      source.connect(worklet);

      setPhase('recording');
      drawLive();

      // Auto-stop after TARGET_DURATION_S so users don't have to time the release.
      setTimeout(() => {
        if (streamRef.current) stop();
      }, TARGET_DURATION_S * 1000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  function stop() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    analyserRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;

    const total = recordedChunks.current.reduce((s, c) => s + c.length, 0);
    const buf = new Float32Array(total);
    let off = 0;
    for (const c of recordedChunks.current) {
      buf.set(c, off);
      off += c.length;
    }
    setSamples(buf);
    setPhase('done');
  }

  // Draw the live oscilloscope while recording.
  function drawLive() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      analyser.getByteTimeDomainData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const slice = w / data.length;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        const y = h / 2 + v * (h / 2 - 4);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * slice, y);
      }
      ctx.stroke();
      animRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  // Once recording finishes, draw a "zoom in" view that shows individual sample dots.
  useEffect(() => {
    const canvas = zoomCanvasRef.current;
    if (!canvas || !samples) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Show ~120 samples — a ~2.5ms slice — so each sample is visible as a dot.
    const ZOOM = 120;
    // Pick a slice from somewhere mid-recording to skip silence.
    const start = Math.max(0, Math.floor(samples.length * 0.4));
    const slice = samples.subarray(start, start + ZOOM);

    // Baseline
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Dot per sample
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    const dx = w / (slice.length - 1);
    let prevX = 0;
    let prevY = h / 2;
    for (let i = 0; i < slice.length; i++) {
      const x = i * dx;
      const y = h / 2 - slice[i] * (h / 2 - 6);
      // Connect dots so the wave reads continuously.
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();
      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      prevX = x;
      prevY = y;
    }
  }, [samples]);

  const totalSamples = samples?.length ?? 0;
  const recordedSeconds = totalSamples / actualSampleRate;
  const rawBytesForRecording = totalSamples * BIT_DEPTH_BYTES;
  const rawKBPerSecond = (actualSampleRate * BIT_DEPTH_BYTES) / 1024;
  const rawMBPerMinute = (rawKBPerSecond * 60) / 1024;

  return (
    <Section
      id="sound"
      eyebrow="Step 1"
      title="What is sound, really?"
      intro={
        <>
          <p>
            Sound is just <strong>pressure waves wiggling air</strong>. Your eardrum feels
            those wiggles and your brain interprets them as voice or music. A microphone
            does the same job — except instead of feeling, it <strong>measures</strong>{' '}
            the pressure many thousands of times per second and writes each measurement
            down as a number.
          </p>
          <p>
            That stream of numbers is called <strong>PCM</strong> (Pulse-Code Modulation).
            It's the raw, uncompressed truth of what a microphone heard.
          </p>
        </>
      }
      tone="light"
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft p-4 sm:p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Try it: turn your voice into numbers</h3>
          <span className="text-xs text-gray-500">
            Sample rate (your device): {actualSampleRate.toLocaleString()} Hz
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Click the button and speak (or hum) for about a second and a half.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (phase === 'idle' || phase === 'done' || phase === 'error' ? start() : stop())}
            disabled={phase === 'recording'}
            className={`px-5 py-2.5 rounded-lg font-semibold text-white transition-colors ${
              phase === 'recording'
                ? 'bg-red-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {phase === 'recording' ? 'Recording…' : phase === 'done' ? 'Record again' : 'Start recording'}
          </button>
          {phase === 'error' && (
            <span className="text-sm text-red-600">{err}</span>
          )}
        </div>

        <div className="mt-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={140}
            className="w-full h-28 sm:h-32 rounded-lg bg-gray-50 border border-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500">
            Live waveform — every pixel is the mic's current pressure reading.
          </p>
        </div>

        {phase === 'done' && samples && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
            <div>
              <h4 className="font-semibold text-gray-900">Zoom in</h4>
              <p className="mt-1 text-sm text-gray-600">
                A ~2.5 ms slice from your recording, blown up. Every dot is one sample —
                one number — that the mic actually captured.
              </p>
              <canvas
                ref={zoomCanvasRef}
                width={500}
                height={180}
                className="mt-3 w-full h-40 rounded-lg bg-gray-50 border border-gray-100"
              />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">The cost of raw audio</h4>
              <dl className="mt-2 space-y-2 text-sm">
                <Row label="Samples captured" value={totalSamples.toLocaleString()} />
                <Row label="Duration" value={`${recordedSeconds.toFixed(2)} s`} />
                <Row label="Bytes per sample" value={`${BIT_DEPTH_BYTES} (16-bit)`} />
                <Row
                  label="This recording, raw"
                  value={`${(rawBytesForRecording / 1024).toFixed(1)} KB`}
                  emphasis
                />
                <Row label="Raw audio rate" value={`${rawKBPerSecond.toFixed(0)} KB/s`} />
                <Row
                  label="One minute of raw audio"
                  value={`${rawMBPerMinute.toFixed(1)} MB`}
                  emphasis
                />
              </dl>
              <p className="mt-3 text-sm text-gray-600">
                A 10-minute call at this quality would be{' '}
                <strong>{(rawMBPerMinute * 10).toFixed(0)} MB</strong>. Your data plan would
                not be happy. This is the problem a codec like Opus has to solve.
              </p>
            </div>
          </div>
        )}
      </div>

      <Aside>
        <strong>Note on numbers.</strong> A 16-bit sample can be one of 65,536 values
        (−32,768 to 32,767). The sample rate of 48 kHz isn't arbitrary — it's enough to
        capture frequencies up to 24 kHz, which covers everything humans can hear (the{' '}
        <Cite href="https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem">
          Nyquist–Shannon sampling theorem
        </Cite>
        ).
      </Aside>
    </Section>
  );
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex justify-between items-baseline border-b border-gray-100 pb-1.5">
      <dt className="text-gray-600">{label}</dt>
      <dd className={`font-mono ${emphasis ? 'text-primary-700 font-semibold' : 'text-gray-900'}`}>
        {value}
      </dd>
    </div>
  );
}
