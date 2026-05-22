# ICE, STUN, and TURN: getting through the NAT

> 💡 **What you'll learn**
> - Why "just open a UDP connection" doesn't work between two browsers on
>   home internet
> - What the ICE *algorithm* actually does (it's not a server)
> - What STUN gives you for free, and the type of network where it's not
>   enough
> - When you have to pay for a TURN relay, and what it costs
> - The "glare" problem — both peers offering at once — and our
>   deterministic side-step

## The problem

Your laptop's IP address is something like `192.168.1.47`. So is Bob's.
Those addresses are meaningless on the public internet — both of you have
one, and there's no way to route between them. The router has *one*
public IP, and it does *Network Address Translation* (NAT): when you make
an outbound connection, it picks a port on its public IP, remembers the
mapping `(your local 192.168.1.47:54321) ↔ (router public 75.x.x.x:62000)`,
and rewrites the packets on the way out.

That works fine for outbound TCP. It does *not* work for inbound traffic
from a stranger: Bob's browser tries to send a UDP packet to your router's
public IP, the router has no mapping for that source, and drops it.

Worse, there are several flavours of NAT, each progressively meaner:

| NAT type | Behaviour | Can a peer reach you? |
|---|---|---|
| **Full cone** | Once you've sent any packet from `internal:X` to `anyone`, anyone on the internet can now send to `public:Y`. | Easy. STUN works. |
| **Restricted cone** | After you've sent to `bob:port`, only `bob:port` can send back. | STUN works. |
| **Port-restricted cone** | Stricter than restricted cone, but still STUN-friendly. | STUN works. |
| **Symmetric** | The router picks a *different* public port for every (dest IP, dest port) pair. Your mapping to `stun.example.com` is different from your mapping to Bob. | STUN fails. You need TURN. |

About 10-20% of consumer routers use symmetric NAT. Corporate firewalls
often do worse — blocking outbound UDP entirely.

ICE is the algorithm that handles all of this transparently.

## The mental model

**ICE** (Interactive Connectivity Establishment) is *not* a server, even
though it's often spoken of like one. It's the algorithm each browser
runs locally to discover all the network paths it might be reachable on,
share them with the peer, and pick a working pair.

```
        STUN server                              TURN server
       (free, stateless)                     (paid, bandwidth-heavy)
              │                                      │
              │                                      │
              │  "Hi, what does my address look      │
              │   like from your side?"              │
   ┌──────────┴──────────┐                ┌──────────┴──────────┐
   │                     │                │                     │
   │   Alice browser     │                │                     │
   │                     │                │                     │
   │  Candidates:        │                │                     │
   │   • host 192.168.1.47:54321  ←── her own LAN address       │
   │   • srflx 75.x.x.x:62000     ←── what STUN said            │
   │   • relay 65.x.x.x:7000      ←── reserved on a TURN server │
   │                     │                │                     │
   └─────────────────────┘                └─────────────────────┘
                  │
                  │   Exchanged via signaling (our FastAPI WS)
                  ▼
              Bob's browser does the same. Each side now has
              both lists. Each side pairs them up and starts
              "STUN ping" probes across every pair until one
              answers back. The first working pair wins.
```

The three flavours of *candidate*:

- **host** — your own LAN address. Works when you and the peer are on the
  same Wi-Fi or wired LAN. Fast and free.
- **srflx** (server-reflexive) — what the world sees, as reported by a
  STUN server. Works for everything except symmetric NAT.
- **relay** — a forwarding address you reserved on a TURN server.
  Bandwidth costs you money per minute, but it works no matter what.

ICE tries them in roughly that order: host pairs first, then srflx, then
relay. The first pair that successfully exchanges a probe wins, and audio
starts flowing over that path.

## STUN — "what's my public address?"

STUN is the simplest server in computing. You send a UDP packet that says
"please tell me where you see this coming from". It replies with the
(public IP, public port) it observed. That's the entire protocol.

Because it's stateless and the responses are tiny, STUN servers handle
millions of clients essentially for free. Several huge ones are free for
public use:

| URL | Provider |
|---|---|
| `stun:stun.l.google.com:19302` | Google. The one we hardcode by default. |
| `stun:global.stun.twilio.com:3478` | Twilio. |
| `stun:stun.cloudflare.com:3478` | Cloudflare. |

Our config at [web/src/lib/webrtc.ts:6](../../web/src/lib/webrtc.ts):

```ts
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  // ...adds TURN servers if VITE_TURN_URL is set...
  return servers;
}
```

You don't need to "set up" STUN — the browser hits the server, gets the
reflexive candidate back, and includes it in the offer.

## TURN — the fallback relay

If both peers are on symmetric NAT, ICE can't make any candidate pair
work directly. The path of last resort is a **TURN** relay: a server
*both* peers connect to, which forwards packets between them. From
the peers' point of view, they each have a stable address on the TURN
server, and they send packets to that address. Real-world latency adds
~10-30 ms, plus you pay for the bandwidth.

Our TURN config is environment-driven. If `VITE_TURN_URL`,
`VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` are set at frontend build
time (see [.env.example](../../.env.example)), they're added to the
`iceServers` array. In production:

- **Cheap**: use a managed TURN provider (Metered.ca free tier,
  Twilio, Xirsys). You get TURN URLs with rotating credentials.
- **Self-host**: install `coturn` on the same VM as the rest of the
  app. See [DEPLOY.md → TURN server (optional, for any path)](../DEPLOY.md#turn-server-optional-for-any-path).

For LAN-only or coffee-shop-Wi-Fi testing, STUN alone is fine. For a
public site where anyone might be on AT&T fibre with symmetric NAT, ship
TURN or you'll have a non-trivial fraction of users say "the call won't
connect".

## Trickle ICE

The browser doesn't gather all candidates before sending the offer; it
streams them as they're discovered. The signaling protocol has to ship
each candidate as it appears, hence our `ice-candidate` WebSocket
message and matching `addIce()` method:

```
Alice                Server                Bob
  │  offer ──────────► │  offer ──────────► │  pc.setRemoteDescription(offer)
  │                    │                    │
  │  ice-candidate ──► │  ice-candidate ──► │  pc.addIceCandidate()
  │  ice-candidate ──► │  ice-candidate ──► │  pc.addIceCandidate()
  │  ... (handful more, over ~500 ms)       │
  │                    │                    │
  │  ◄────── answer ───┤ ◄────── answer ────│
  │  ◄── ice-candidate ┤ ◄── ice-candidate ─│
  │  ...                                    │
  │                                         │
  │  (whichever pair succeeds first becomes "connected")
```

This is why both peers exchange many `ice-candidate` messages, not one.
And it's why a slow signaling connection delays the call setup but
doesn't break it — the more candidates ICE has to work with, the more
likely a working pair is found.

## Glare

When two peers are joining a room at the same instant, both might run
`createOffer` simultaneously. Each then receives the other's offer in
the middle of its own negotiation. This is "glare". WebRTC has a
formal way to handle it (`pc.signalingState` transitions, perfect-
negotiation pattern), but the simpler fix is to *never let it happen*.

Our rule, in [web/src/lib/room.ts:228](../../web/src/lib/room.ts):

> Lexicographic compare on `userId` — the peer whose id sorts *larger*
> initiates the offer.

Both browsers know both userIds, so they reach the same conclusion
deterministically: exactly one side calls `createOffer`, the other
waits to receive it. No race, no special state to recover from.

## In this codebase

| Concept | File | Line | What |
|---|---|---|---|
| STUN configured by default | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts) | 8 | `stun:stun.l.google.com:19302` hardcoded. |
| TURN reads from env | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts) | ~10 | `VITE_TURN_URL` / `_USERNAME` / `_CREDENTIAL`. |
| Trickle ICE outbound | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 272 | `pc.onicecandidate` → `signaling.iceCandidate(...)`. |
| Trickle ICE inbound | [web/src/lib/webrtc.ts](../../web/src/lib/webrtc.ts) | 171 | `addIce(candidate)` → `pc.addIceCandidate(...)`. |
| Glare-avoidance rule | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 228 | `shouldInitiateTo(peerId)` — lexicographic id compare. |
| ICE-state logging | [web/src/lib/room.ts](../../web/src/lib/room.ts) | 279 | `oniceconnectionstatechange` console log — useful when calls don't connect. |

## ⚠️ Gotchas

- **No TURN, fail silent.** If you ship without TURN and a user is on
  symmetric NAT, `iceConnectionState` will go to `failed` and the call
  just... won't have audio. Watch for this in production — at minimum,
  configure a managed TURN.
- **STUN over UDP only.** Some corporate firewalls block UDP entirely.
  STUN-over-TLS exists, TURN-over-TLS exists, but they're per-server
  config. Default Google STUN is UDP-only.
- **The `?transport=tcp` TURN URL is a different listener.** Many TURN
  servers bind both UDP and TCP. Specifying `turn:host:3478?transport=tcp`
  forces TCP fallback for environments that block UDP.
- **ICE gathering can be slow.** On a captive Wi-Fi or VPN, candidate
  gathering can take 5-10 seconds. The call eventually succeeds; users
  see "Calling…" for what feels like forever. Consider a 10-second
  timeout with a clear error.

## 🔧 Try it

1. Run a call locally. Open `chrome://webrtc-internals/`.
2. Find the candidate-pair list (search for `selectedCandidatePair`).
3. Note which pair won. On the same Wi-Fi it'll be `host`-to-`host`.
4. Now turn on a VPN on one machine and call again. The selected pair
   will change — likely `srflx`-to-`srflx`.
5. If you have access to a symmetric NAT (some carrier-grade LTE
   tethers), watch the call fail without TURN.

To see what STUN said about your address:

```bash
# requires: brew install stuntman   (or apt install stuntman-client on Linux)
stunclient stun.l.google.com 19302
# Mapped address: 75.x.x.x:62000
```

## Further reading

- [RFC 8445 — *Interactive Connectivity Establishment (ICE)*](https://datatracker.ietf.org/doc/html/rfc8445).
  The actual algorithm.
- [RFC 5389 — *STUN*](https://datatracker.ietf.org/doc/html/rfc5389). Short.
- [RFC 8656 — *TURN*](https://datatracker.ietf.org/doc/html/rfc8656).
- [WebRTC for the Curious — NAT mapping & ICE chapter](https://webrtcforthecurious.com/docs/03-connecting/)
  is the friendliest walk-through of NAT types and ICE.
- [coturn](https://github.com/coturn/coturn) — the de facto open-source
  TURN/STUN server. What our DEPLOY.md self-host path uses.
