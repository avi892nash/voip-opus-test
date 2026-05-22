# Concepts

Architecture-level explainers for the four technologies that make this app
tick. Each one is standalone — read in any order. Together they fill the
"why is it like that?" gap that [ARCHITECTURE.md](../ARCHITECTURE.md) leaves
implicit.

> 💡 **Audience.** A developer who can read TypeScript and Python and has
> shipped a normal web app, but has never written browser-to-browser audio
> code or thought hard about NAT traversal. If you've already built two
> WebRTC apps, you can skip these.

For end-user-facing teaching of **Opus itself** (what a codec is, how it
splits speech from music, what the bitrate knob does), see the `/learn` page
in the running app — it has live audio demos that no static doc can match.
These four docs cover the *infrastructure around* Opus.

## The four concepts

| Doc | What you'll learn | Where it shows up in the code |
|---|---|---|
| [webrtc.md](./webrtc.md) | What `RTCPeerConnection` actually does, the offer/answer dance, what the browser handles for you (Opus encoding, jitter buffer, NACK, FEC) | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts), [web/src/lib/room.ts](../../web/src/lib/room.ts) |
| [ice-stun-turn.md](./ice-stun-turn.md) | Why two browsers can't talk over plain UDP, how ICE finds a path through the NAT, when STUN suffices vs when you need TURN, the glare problem | [web/src/lib/webrtc.ts:6](../../web/src/lib/webrtc.ts) (`iceServers`), [web/src/lib/room.ts:228](../../web/src/lib/room.ts) (glare rule) |
| [mesh-vs-sfu.md](./mesh-vs-sfu.md) | Why this app caps out at ~5 participants, the math behind that, what an SFU adds when you outgrow mesh | [web/src/lib/room.ts](../../web/src/lib/room.ts) (the whole `RoomManager` is a mesh) |
| [jwt-auth.md](./jwt-auth.md) | What a JWT actually is, why we picked localStorage over httpOnly cookies for a PWA, the trade-offs we accepted | [server/auth.py](../../server/auth.py), [web/src/lib/auth.tsx](../../web/src/lib/auth.tsx) |

## How to read these

Each doc follows the same shape:

1. **The problem** — what would be broken without this technology.
2. **The mental model** — the simplest accurate explanation, usually a
   diagram.
3. **In this codebase** — exact file+line pointers showing where the
   concept materializes in the source.
4. **⚠️ Gotchas** — pitfalls we hit or that you'll hit.
5. **🔧 Try it** — a hands-on experiment (a DevTools panel to open, a
   `curl` to run, a flag to flip).
6. **Further reading** — RFCs and the better blog posts.

If you're skimming, the "In this codebase" section is the cheat-sheet — it
links to the lines that implement what the doc just explained.

## Glossary

Quick-reference terms used throughout. Each links to the doc that explains
it properly.

| Term | One-liner | Read more |
|---|---|---|
| **WebRTC** | Browser API for direct peer-to-peer media and data. | [webrtc.md](./webrtc.md) |
| **SDP** | Plain-text "here's what audio I can speak" descriptor exchanged once at call setup. | [webrtc.md](./webrtc.md#the-offeranswer-dance) |
| **ICE** | Algorithm for finding a working network path between two peers behind NATs. | [ice-stun-turn.md](./ice-stun-turn.md) |
| **STUN** | "Tell me what my public IP looks like from outside" service. Free, stateless, tiny. | [ice-stun-turn.md](./ice-stun-turn.md#stun--whats-my-public-address) |
| **TURN** | Relay server that ferries media when direct ICE fails. Stateful, bandwidth-heavy, costs money. | [ice-stun-turn.md](./ice-stun-turn.md#turn--the-fallback-relay) |
| **DTLS-SRTP** | How WebRTC encrypts the audio packets. Set up automatically inside `RTCPeerConnection`. | [webrtc.md](./webrtc.md#what-the-browser-does-for-you) |
| **Glare** | Both peers try to send an offer at the same time → both refuse the other. We side-step it with a deterministic rule. | [ice-stun-turn.md](./ice-stun-turn.md#glare) |
| **Mesh** | Topology where every peer holds a direct connection to every other peer. What this app uses. | [mesh-vs-sfu.md](./mesh-vs-sfu.md) |
| **SFU** | Selective Forwarding Unit — a media-aware server that routes each peer's stream to others. | [mesh-vs-sfu.md](./mesh-vs-sfu.md#the-sfu-pattern) |
| **JWT** | Self-contained signed token — `header.payload.signature` base64-joined. | [jwt-auth.md](./jwt-auth.md) |
| **HS256** | HMAC-SHA-256 — symmetric JWT signing algorithm. Our choice. | [jwt-auth.md](./jwt-auth.md#how-hs256-works) |
