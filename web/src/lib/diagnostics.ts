// Console diagnostics for live calls/rooms. Attach a getter on window that
// returns a Promise<table> with what's actually flowing through the active
// RTCPeerConnection(s). Usage in DevTools:
//
//   await voipStats()
//
// Prints a console.table of bytes sent/received, packets, jitter, audioLevel,
// etc. — the same data chrome://webrtc-internals shows, but inline so you
// don't have to context-switch.

type PCProvider = () => RTCPeerConnection[];

const providers = new Set<PCProvider>();

export function registerStatsProvider(provider: PCProvider): () => void {
  providers.add(provider);
  return () => providers.delete(provider);
}

interface FlowRow {
  peerId?: string;
  direction: 'out' | 'in';
  kind: string;
  codec?: string;
  bytes: number;
  packets: number;
  audioLevel?: number;
  jitter?: number;
  packetsLost?: number;
}

async function collect(): Promise<FlowRow[]> {
  const rows: FlowRow[] = [];
  const pcs: RTCPeerConnection[] = [];
  for (const p of providers) pcs.push(...p());

  for (const pc of pcs) {
    const report = await pc.getStats();
    // Build a peerId hint from the connection's remote ICE candidate if any.
    let peerId: string | undefined;
    report.forEach((s) => {
      if (s.type === 'remote-candidate' && !peerId) peerId = String(s.address || '');
    });

    // Map id → codec
    const codecs = new Map<string, string>();
    report.forEach((s) => {
      if (s.type === 'codec') codecs.set(s.id, s.mimeType);
    });

    report.forEach((s) => {
      if (s.type === 'outbound-rtp' && s.kind === 'audio') {
        rows.push({
          peerId,
          direction: 'out',
          kind: 'audio',
          codec: codecs.get(s.codecId as string),
          bytes: s.bytesSent ?? 0,
          packets: s.packetsSent ?? 0,
        });
      } else if (s.type === 'inbound-rtp' && s.kind === 'audio') {
        rows.push({
          peerId,
          direction: 'in',
          kind: 'audio',
          codec: codecs.get(s.codecId as string),
          bytes: s.bytesReceived ?? 0,
          packets: s.packetsReceived ?? 0,
          audioLevel: s.audioLevel,
          jitter: s.jitter,
          packetsLost: s.packetsLost,
        });
      }
    });
  }
  return rows;
}

declare global {
  interface Window {
    voipStats: () => Promise<FlowRow[]>;
  }
}

if (typeof window !== 'undefined') {
  window.voipStats = async () => {
    const rows = await collect();
    if (rows.length === 0) {
      console.warn('voipStats: no active RTCPeerConnection. Open this from inside a call/room.');
    } else {
      console.table(rows);
    }
    return rows;
  };
}
