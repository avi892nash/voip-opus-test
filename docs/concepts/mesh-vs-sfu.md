# Mesh vs SFU: how multi-party voice scales (and why this app caps at ~5)

> 💡 **What you'll learn**
> - Why one `RTCPeerConnection` per call isn't enough for a 3-person room
> - The N(N-1)/2 math behind mesh topologies, with concrete bandwidth
>   numbers
> - The SFU pattern — what you gain, what you pay
> - When mesh is the right answer, when it isn't

## The problem

`RTCPeerConnection` is *peer-to-peer*. It connects exactly two browsers.
For a 1:1 call that's perfect. But Discord-style rooms have more than
two people. How do you wire up four?

Three choices:

1. **Mesh** — every peer holds a direct connection to every other peer.
   What this app does.
2. **SFU** (Selective Forwarding Unit) — every peer connects to one
   server; the server forwards each peer's stream to the other peers.
3. **MCU** (Multipoint Control Unit) — server decodes everyone's audio,
   mixes it into one stream, sends one stream back per peer. Expensive
   and rare today.

## Mesh

Mental model: a complete graph of `RTCPeerConnection`s.

```
              N = 3 people in a room
              Each holds 2 connections.

                 Alice
                  /\
                 /  \
                /    \
               /      \
              /        \
             Bob ─────── Carol


              N = 4

                  Alice
                  /  | \
                 /   |  \
                /    |   \
               /     |    \
              /      |     \
             Bob ────┼──── Dave
              \      |     /
               \     |    /
                \    |   /
                 \   |  /
                  \  | /
                  Carol

              N = 5    ←  starts getting busy

                   Alice
                  / | \ \
                 /  |  \ \
                Bob ─── Carol
                 \\  X  ||
                  \ X X //
                  Dave ── Eve
```

### The math

For a mesh of N peers:

- **Total `RTCPeerConnection`s in the system:** N × (N − 1) / 2.
- **Per browser:** N − 1.
- **Per browser, per-second outbound audio:** (N − 1) × Opus-bitrate.
  Opus speech is typically 24–32 kbps, so:

| N peers | Connections per browser | Outbound bandwidth per browser @ 24 kbps Opus | Encoder runs |
|---|---|---|---|
| 2 | 1 | 24 kbps | once |
| 3 | 2 | 48 kbps | **once** (same mic stream fanned out) |
| 4 | 3 | 72 kbps | once |
| 5 | 4 | 96 kbps | once |
| 6 | 5 | 120 kbps | once |
| 10 | 9 | 216 kbps | once |

The encoder running just once is a non-obvious win: we call
`getUserMedia` exactly once when the user joins the room, then attach the
*same* `MediaStream` to every PC. Mute applies to the track, so it
propagates to every peer at once. See
[web/src/lib/room.ts:240](../../web/src/lib/room.ts):

```ts
if (this.localStream) {
  for (const track of this.localStream.getTracks()) {
    pc.addTrack(track, this.localStream);
  }
}
```

So CPU scales linearly with peer count (decoding N-1 incoming streams),
*not* quadratically. The quadratic cost is **upstream bandwidth**.

### Why it caps at ~5

Three pressure points come at once around N = 5–6:

| Pressure | Why |
|---|---|
| **Upload bandwidth** | A home DSL with 1 Mbps up still has plenty of slack at 96 kbps × 1 user = 96 kbps total. But on a 2025 phone over cellular, 5 simultaneous Opus uploads is enough to provoke uplink congestion and packet loss. |
| **Encoder CPU** | Browser's native Opus encoder is fast, but running it at full quality with 5 outbound RTCPs adds packetization, FEC, and bandwidth-estimation overhead per peer. |
| **Decoder CPU** | Decoding 4 simultaneous Opus streams + running echo cancellation across all of them + AGC is a real CPU load on low-end phones. Older Androids start to drop frames around N = 5. |
| **ICE negotiation time** | Joining a 5-person room means 4 separate ICE handshakes. On a slow network, "joining" can take 5–10 seconds. |

The cap isn't a hard number. It's the point where complaints start. Six
people on fast laptops and good Wi-Fi works fine; six people on assorted
phones over cellular won't.

If you outgrow it, you don't fix mesh — you switch to an SFU.

## The SFU pattern

```
                 SFU server
                 (audio router)
                    │
        ┌───────────┼───────────┐
        │           │           │
       Alice       Bob        Carol

   Each peer has ONE RTCPeerConnection (to the SFU).
   Each peer sends ONE upstream — to the SFU.
   The SFU forwards each peer's stream to every other peer.
```

The trade-offs are:

| | Mesh | SFU |
|---|---|---|
| Servers needed | None for media (signaling only) | A media server, scaled by participant-minutes |
| Per-peer upload | N − 1 streams | 1 stream |
| Per-peer download | N − 1 streams | N − 1 streams (no change) |
| Encoder runs | Once | Once |
| Audio touched by server | Never (encrypted with SRTP key the server doesn't have) | The server sees the encrypted packets but routes by SSRC; **with simulcast, the server transcodes/forwards selectively** — still doesn't decrypt unless explicitly configured |
| Recording / transcription | Each peer would have to record itself | Trivial — record on the server |
| Cost | Pure bandwidth on user's link | Server CPU + bandwidth (typical: $X / participant-hour) |
| Latency | One hop (peer ↔ peer direct) | Two hops (peer ↔ SFU ↔ peer) |
| Adding moderation features | Hard | Easy — server can mute, kick, transcribe |

For voice-only consumer scenarios with ≤5 participants, mesh wins on
every axis except scale. For 6+ people, classrooms, podcasts, anything
recorded, an SFU is correct.

## In this codebase

The whole `RoomManager` class is the mesh implementation.

| Concept | File | Line | Notes |
|---|---|---|---|
| Mesh state shape | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 62 | `private peers: Map<peerId, PeerLink>` |
| One mic, fanned out | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 240 | Same `localStream` `addTrack`-ed onto every PC. |
| Glare avoidance | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 228 | Larger `userId` initiates. (See [ice-stun-turn.md → Glare](./ice-stun-turn.md#glare).) |
| Per-peer teardown | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 222 | On `participant-left`, just close that one PC. The rest of the mesh keeps going. |
| Lazy peer creation | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 322 | If an `offer` arrives before `participant-joined`, register the peer with a placeholder name. |

The server side is even simpler — `ConnectionManager` in
[server/ws/signaling.py](../../server/ws/signaling.py) only routes
SDP/ICE messages between members of the same room. It has zero awareness
of media.

## ⚠️ Gotchas

- **Not every peer is at the same state at the same time.** Alice's PC
  to Bob can be `connected` while her PC to Carol is still `connecting`.
  Treat per-peer state as independent. Look at
  `RoomManager.snapshot()` — each peer has its own `state` field.
- **The order of `participant-joined` and the first `offer` is not
  guaranteed.** Network ordering can deliver the offer first. We handle
  that with lazy peer creation; without it you'd drop the call.
- **One peer's catastrophic failure shouldn't kill others.** Make sure
  `removePeer()` closes one specific PC and removes one specific
  participant, never affecting the others.
- **Mute via track-disable doesn't stop the encoder.** WebRTC keeps
  sending silent (encoded) packets when a track is `enabled = false`.
  That's fine for audio (Opus DTX makes silence essentially free), but
  worth knowing if you wonder why the upload graph doesn't drop to zero
  when you mute.

## When to upgrade past mesh

Signals that you've outgrown it:

- Users on phones consistently report stuttering past N = 4.
- Average join time exceeds 3 seconds.
- You need server-side features: recording, live transcription, AI
  moderation, ban kicks.
- You want to ship video. (Video at 500 kbps × N − 1 outbound is much
  worse than audio.)

When you make the switch, the open-source candidates are:

- **[mediasoup](https://mediasoup.org/)** — Node-friendly C++ core,
  great for adding to an existing Node app. The de facto choice for
  custom SFUs.
- **[LiveKit](https://livekit.io/)** — self-hostable SFU + a polished
  client SDK. Designed for product teams who don't want to write
  signaling from scratch.
- **[Janus](https://janus.conf.meetecho.com/)** — older but battle-tested.
  Plugin-based.
- **[Pion](https://github.com/pion/webrtc)** — Go WebRTC library; you
  build the SFU yourself. Maximum flexibility.

## 🔧 Try it

Look at the upload graph in `chrome://webrtc-internals/` during a 3-person
room. You'll see *two* `RTCPeerConnection` panels in your tab, each with
its own `bytesSent` curve. Add up the two — that's your total outbound.
Now imagine the same call at N = 6.

For a more theoretical experiment: in DevTools, set
`RoomManager.peers.size = 10` (you can't actually create 10 peers, but
the math: 10 peers → 9 connections per browser → 216 kbps upload per
person. Is your home upload fast enough?).

## Further reading

- [BlogGeek.me — *Mesh vs SFU vs MCU*](https://bloggeek.me/webrtcglossary/mesh/)
  is the standard explainer.
- [mediasoup design notes](https://mediasoup.org/documentation/v3/scalability/)
  — once you're thinking SFU, mediasoup's own docs are the right primer
  on the actual constraints.
- [Pion's "What is an SFU?"](https://webrtcforthecurious.com/docs/08-applied-webrtc/#selective-forwarding-unit-sfu)
  in the WebRTC-for-the-curious book.
- The signaling protocol in this repo
  ([docs/PROTOCOL.md](../PROTOCOL.md)) is mesh-shaped: messages are
  per-peer (`to: userId`). Moving to an SFU would simplify it — you
  only ever sign with the SFU.
