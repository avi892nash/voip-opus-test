# Signaling protocol

All real-time communication between client and server flows over a single
WebSocket at `/ws?token=<jwt>`. The JWT is the one obtained from
`POST /api/auth/login` or `POST /api/auth/signup`.

Every message is JSON with a top-level `type` field. The server validates
`type`, `to`, and `data` and silently drops anything it doesn't recognize.

The server's job is **just signaling** — once peers have exchanged SDP and ICE
candidates, audio flows directly between them over RTP/SRTP. The server never
sees the audio.

There are two coexisting flows:

1. **1:1 calls** (`/call` page) — Alice rings Bob; he accepts or declines.
2. **Multi-party rooms** (`/room/:code` page) — anyone in the room can talk to
   anyone else, full mesh. Joining is the accept; there's no separate ring.

Both flows share the same per-peer `offer` / `answer` / `ice-candidate` /
`hang-up` messages — only the ceremony around them differs.

## Connection lifecycle

```
client                                              server
  │                                                   │
  │  WS upgrade /ws?token=<jwt>                       │
  │ ────────────────────────────────────────────────► │
  │                  (server validates JWT)           │
  │ ◄──── { "type": "websocket-connected", ... }      │
  │ ◄──── { "type": "contacts-update", "data": [...] }│
  │                                                   │
  │            (some other user connects)             │
  │ ◄──── { "type": "contacts-update", "data": [...] }│
  │                                                   │
```

If the token is missing/invalid, the server closes the WS with code **1008
(Policy Violation)** before sending any application messages.

## Messages

### Server → client

| `type`                 | When                                          | `data`                                              | Other fields |
|------------------------|-----------------------------------------------|-----------------------------------------------------|--------------|
| `websocket-connected`  | Right after a successful handshake            | `{ user: PublicUser }`                              | —            |
| `contacts-update`      | Whenever the online roster changes            | `PublicUser[]`                                      | —            |
| `call-request`         | Someone is calling you (1:1)                  | `{ callerId, callerName }`                          | `from`       |
| `call-response`        | The peer accepted/declined (1:1)              | `{ accepted: boolean }`                             | `from`       |
| `call-failed`          | Your outbound call could not start            | `{ reason: string }`                                | —            |
| `room-joined`          | You're now in a room                          | `{ code, you, participants: PublicUser[] }`         | —            |
| `room-left`            | You've left a room (voluntary or implicit)    | `{ code }`                                          | —            |
| `room-error`           | Room operation failed                         | `{ reason: string }`                                | —            |
| `participant-joined`   | Someone else joined your current room         | `{ code, participant: PublicUser }`                 | —            |
| `participant-left`     | Someone else left your current room           | `{ code, userId }`                                  | —            |
| `offer`                | Forwarded SDP offer from peer                 | `RTCSessionDescriptionInit`                         | `from`       |
| `answer`               | Forwarded SDP answer from peer                | `RTCSessionDescriptionInit`                         | `from`       |
| `ice-candidate`        | Forwarded ICE candidate from peer             | `RTCIceCandidateInit`                               | `from`       |
| `hang-up`              | Peer hung up                                  | (empty)                                             | `from`       |
| `error`                | Malformed message etc.                        | `{ message: string }`                               | —            |

### Client → server

| `type`         | Purpose                                       | `to`    | `data`                                              |
|----------------|-----------------------------------------------|---------|-----------------------------------------------------|
| `call-request` | Ring a specific user (1:1)                    | user id | (empty)                                             |
| `call-response`| Accept or decline an inbound call             | user id | `{ accepted: boolean }`                             |
| `room-create`  | Reserve a new room (creator auto-joins)       | —       | `{ code? }` — optional preferred code               |
| `room-join`    | Join an existing room (or auto-create on miss)| —       | `{ code }`                                          |
| `room-leave`   | Leave your current room                       | —       | (empty)                                             |
| `offer`        | Send your SDP offer to a specific peer        | user id | `RTCSessionDescriptionInit`                         |
| `answer`       | Send your SDP answer to a specific peer       | user id | `RTCSessionDescriptionInit`                         |
| `ice-candidate`| Send an ICE candidate to a specific peer      | user id | `RTCIceCandidateInit`                               |
| `hang-up`      | End the call / signal this peer               | user id | (empty)                                             |

For room signaling, the server enforces that `to` must be another member of
the sender's current room. Cross-room messages are silently dropped.

### `PublicUser`

```json
{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2026-05-11T..."
}
```

## Typical 1:1 call flow

```
Alice                       Server                       Bob
  │   call-request(to=Bob)    │                            │
  │ ─────────────────────────►│   call-request(from=Alice) │
  │                           │ ─────────────────────────► │   (UI shows incoming)
  │                           │                            │
  │                           │   call-response(accepted)  │
  │  call-response(accepted)  │ ◄───────────────────────── │
  │ ◄─────────────────────────│                            │
  │                                                        │
  │                  offer (SDP) ───────────────────────►  │
  │                                                        │   pc.setRemoteDescription(offer)
  │  ◄─────────────────── answer (SDP)                     │   pc.createAnswer()
  │                                                        │
  │  ◄───────── ice-candidate ─────────►                   │   (bidirectional, until ICE done)
  │                                                        │
  │   (peer connection established — audio flows P2P)      │
  │                                                        │
  │  hang-up ─────────────────────────────────────────►    │
```

## Typical multi-party room flow

Three users joining a room one by one. Glare-avoidance rule: of any pair, the
side whose `userId` compares LARGER is the one that initiates the offer.

```
Alice                  Server                  Bob                  Carol
  │  room-create          │                      │                      │
  ├──────────────────────►│                      │                      │
  │  room-joined          │                      │                      │
  │   (you, [])           │                      │                      │
  │◄──────────────────────┤                      │                      │
  │                       │  room-join(code)     │                      │
  │                       │◄─────────────────────┤                      │
  │                       │  room-joined         │                      │
  │                       │   (you, [Alice])     │                      │
  │                       ├─────────────────────►│                      │
  │  participant-joined   │                      │                      │
  │   (Bob)               │                      │                      │
  │◄──────────────────────┤                      │                      │
  │                                                                     │
  │      offer / answer / ice via server         │                      │
  │  ◄═══════════════════════════════════════►   │                      │
  │      (whichever userId is larger sends the offer)                   │
  │                                                                     │
  │  ◄══════════════ DIRECT P2P AUDIO ═══════════►                      │
  │                                                                     │
  │                       │   room-join(code)                           │
  │                       │◄────────────────────────────────────────────┤
  │                       │   room-joined (you, [Alice, Bob])           │
  │                       ├────────────────────────────────────────────►│
  │  participant-joined   │   participant-joined                        │
  │   (Carol)             │    (Carol)                                  │
  │◄──────────────────────┼─────────────────────►                       │
  │                                                                     │
  │      offer/answer/ice ════►                  ◄════ offer/answer/ice │
  │                          ◄════════════════════════════════►          │
  │                                                                     │
  │  ◄════ DIRECT AUDIO ════►   ◄════ DIRECT AUDIO ════►                │
  │  ◄═════════════════════ DIRECT AUDIO ══════════════════════════════►│
```

After all peer connections are established, the server is no longer in the
path — audio flows directly between every pair of browsers. For N participants
in a room, each browser maintains N-1 RTCPeerConnections.

### Disconnect handling

If a participant's WebSocket closes (tab refresh, network drop, leave room),
the server treats it as an implicit `room-leave`: removes them from the room
and broadcasts `participant-left` to remaining members so each peer can tear
down its corresponding `RTCPeerConnection`.
