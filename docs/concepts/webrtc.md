# WebRTC: how the browser talks to another browser

> 💡 **What you'll learn**
> - What `RTCPeerConnection` is and why it isn't just a `WebSocket`
> - The "offer / answer" handshake that has to happen before audio can flow
> - The list of unglamorous things the browser handles for you — Opus
>   encoding, packetization, jitter buffering, NACK, FEC, DTLS-SRTP
> - Why this app's signaling server is *not* a media server

## The problem

You have two browser tabs and want to send audio between them with low
latency (under ~150 ms). Your usual tools fail:

- A REST API round-trip is at least ~100 ms even on a fast network. You'd
  blow the latency budget just *asking* what to send.
- A `WebSocket` is bidirectional but still goes through your server. You'd
  pay double the latency (browser → server → other browser) on every audio
  packet, your server would relay every byte of every conversation, and
  you'd burn 50 packets a second of bandwidth on a thing that has nothing
  to do with what your server is *for*.
- Plain UDP from a browser? The browser doesn't expose it. Even if it did,
  most users sit behind a NAT that won't accept inbound packets from a
  random peer.

What you want: a *direct* network connection from one browser straight to
another, carrying encrypted audio. That's WebRTC.

## The mental model

WebRTC isn't one API; it's three working together.

| API | What it does | We use it |
|---|---|---|
| `navigator.mediaDevices.getUserMedia()` | "May I have the microphone?" Returns a `MediaStream`. | ✅ |
| `RTCPeerConnection` | The actual peer-to-peer pipe. Negotiates a path through the network, encrypts in transit, encodes/decodes audio. | ✅ |
| `RTCDataChannel` | Bonus: an arbitrary low-latency byte pipe over the same connection. Like UDP-with-encryption. | ❌ (we'd use this if we ever wanted chat) |

Setting one up is **not** like opening a socket. It's a *negotiation*:

```
   Alice                                         Bob
    │                                             │
    │  "Here's everything I can do.               │
    │   Opus at 48kHz, FEC on, AGC on,            │
    │   here are 6 possible network paths."       │
    │     (SDP offer + ICE candidates)            │
    ├────────────── via signaling ──────────────► │
    │                                             │
    │            "I can do Opus at 48kHz too.     │
    │             Here's how to reach me. I picked│
    │             this network path."             │
    │              (SDP answer + ICE)             │
    │ ◄──────────── via signaling ──────────────  │
    │                                             │
    │    [DTLS handshake — encryption key]        │
    │   ◄─────────── direct UDP ───────────────►  │
    │                                             │
    │    [SRTP — Opus packets, ~50/sec]           │
    │   ◄─────────── direct UDP ───────────────►  │
    │                                             │
```

Two things to notice:

1. The negotiation messages (SDP, ICE) travel **via signaling**, which is
   *anything you want*. Email, a phone call, a carrier pigeon, or — in our
   case — a WebSocket to our FastAPI backend. WebRTC has no opinion about
   how SDP gets from A to B; it just needs the bytes to arrive.

2. Once the negotiation is done, **the server is not in the path**. The
   audio packets travel directly from Alice's machine to Bob's. You could
   shut the signaling server off mid-call and the conversation would keep
   going.

This is the single most important property of WebRTC, and the reason this
repo's backend can be tiny: it's a matchmaker, not a relay.

## The offer/answer dance

In code, the dance has six moves. Here's the version `Call.start()` in
[web/src/lib/webrtc.ts:140](../../web/src/lib/webrtc.ts) runs as the caller:

```ts
// 1. Ask the browser for audio. This is the prompt the user sees.
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
});

// 2. Create the connection object. Pass the list of ICE servers so it can
//    figure out what your IP looks like from outside.
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

// 3. Attach the mic. Whatever's on this track is what the other side will hear.
for (const track of stream.getTracks()) pc.addTrack(track, stream);

// 4. Generate "here's what I can do" as a text blob.
const offer = await pc.createOffer({ offerToReceiveAudio: true });
await pc.setLocalDescription(offer);

// 5. Send that text blob to the other browser somehow. (We use a WebSocket.)
signaling.send({ type: 'offer', to: bobId, data: offer });

// 6. When Bob's "here's what I can do" comes back via signaling:
//    pc.setRemoteDescription(answer);
//    From here, ICE candidates trickle in for a few hundred ms,
//    and then audio just starts flowing.
```

The receiver mirrors moves 1-3, then on the inbound offer:

```ts
await pc.setRemoteDescription(offer);
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
signaling.send({ type: 'answer', to: aliceId, data: answer });
```

If you want to see the actual SDP that gets exchanged, paste this into
DevTools console while in a call: `pc.localDescription.sdp` — it's an
~80-line plain-text blob describing the codec, packetization, encryption
fingerprint, and supported network paths.

## What the browser does for you

This is what makes WebRTC worth using over rolling your own UDP. All of
this is **automatic** once `setRemoteDescription` returns:

| Concern | What the browser does |
|---|---|
| **Audio capture & playback** | `getUserMedia` handles permissions, sample-rate conversion, echo cancellation, noise suppression, AGC. |
| **Encoding** | Opus, hardware-accelerated when available. Native code, faster than any WASM build. |
| **Packetization** | Opus frames are wrapped in RTP packets with sequence numbers and timestamps. |
| **Jitter buffer** | Incoming packets get queued briefly and reordered, smoothing out network jitter before they reach the speaker. |
| **NACK** | If a packet doesn't arrive, the receiver asks the sender to retransmit (within a tight window). |
| **FEC** | Opus' in-band Forward Error Correction lets the receiver reconstruct one missing packet without a round-trip. |
| **Bandwidth estimation** | The browser measures the path and adjusts Opus bitrate up or down on the fly. |
| **DTLS** | A separate TLS handshake happens at the start of the call to agree on an SRTP encryption key. |
| **SRTP** | Every packet is encrypted symmetrically. Even if you sniffed the wire you'd see opaque bytes. |

The whole reason we **don't** use the WASM `opus-recorder` in the call path
is items 2-7 on that list. The browser already has them, hand-tuned, in
native code. JavaScript Opus can't beat that. We use `opus-recorder` only
on the `/demo` page where the *point* is showing the encoder, not getting
the best call quality. See [web/src/lib/opusEncoder.ts](../../web/src/lib/opusEncoder.ts).

## In this codebase

| Concept | File | Line | What it does |
|---|---|---|---|
| 1:1 `RTCPeerConnection` wrapper | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts) | 26 | The `Call` class wraps one `RTCPeerConnection` for a 1:1 call. |
| Mesh of `RTCPeerConnection`s | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 62 | `RoomManager.peers` is `Map<peerId, PeerLink>`, one PC per peer. |
| `getUserMedia` call | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts) | 59 | Audio-only constraints, with EC/NS/AGC enabled. |
| Offer generation | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts) | 145 | `pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false })`. |
| Signaling client | [web/src/lib/signaling.ts](../../web/src/lib/signaling.ts) | — | The thing that ferries SDP + ICE through our FastAPI WS. |
| Server-side signaling relay | [server/ws/signaling.py](../../server/ws/signaling.py) | — | Forwards `offer`/`answer`/`ice-candidate` from `from` to `to`. Never inspects the SDP. |

## ⚠️ Gotchas

- **Secure context required.** `navigator.mediaDevices.getUserMedia` is
  only available on HTTPS or `http://localhost`. Open a `192.168.x.x`
  address in another tab and you'll get `getUserMedia is undefined`. The
  code at [webrtc.ts:48](../../web/src/lib/webrtc.ts) explicitly checks
  for this and surfaces a useful error.
- **Autoplay policy.** A remote audio stream attached to `<audio>` won't
  play until *some* user gesture has occurred on the page. Reload, then
  immediately receive a call without clicking anything = no sound. We
  side-step by always making the user click "Accept" or "Call" before
  the call starts.
- **Same-machine echo loop.** Two tabs on one laptop calling each other
  will cause the AEC to silence both. Use two devices for end-to-end
  testing, or disable EC in DevTools.
- **`addTrack` order matters.** The browser writes the SDP based on what
  tracks are attached *at the moment `createOffer` runs*. Add tracks
  before, not after.

## 🔧 Try it

Open `chrome://webrtc-internals/` in a tab while running a call. You'll
see, in real time:

- The SDP both sides agreed to (look for `RTP/SAVPF 111` — `111` is the
  Opus payload type).
- All ICE candidates each side gathered, including each candidate's type
  (`host`, `srflx`, `relay`) and which pair won.
- Per-second graphs of `bytesSent`, `bytesReceived`, `packetsLost`,
  `jitter`. Watch them while you flip the laptop's Wi-Fi off and on.

This page is the single best teaching tool for understanding what's
actually happening inside `RTCPeerConnection`.

## Further reading

- [RFC 8825 — *Overview: Real-Time Protocols for Browser-Based Applications*](https://datatracker.ietf.org/doc/html/rfc8825)
  is the WebRTC overview RFC. Short for an RFC; readable.
- [MDN's WebRTC API guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
  is the right reference page.
- [WebRTC for the Curious](https://webrtcforthecurious.com/) is an
  open-source book that explains every layer (RTP, RTCP, ICE, DTLS,
  SRTP) at the level of "how would I implement this myself". Excellent.
- The `chrome://webrtc-internals` page exists in Edge as `edge://webrtc-internals/`
  and Firefox as `about:webrtc`. They're all worth knowing.
