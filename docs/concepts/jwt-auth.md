# JWT auth: stateless tokens, with a PWA twist

> 💡 **What you'll learn**
> - What a JWT actually *is* (three base64 segments, one signature)
> - How HS256 signing keeps the server honest about what's in the token
> - Why we picked `localStorage` over `httpOnly` cookies for this PWA, and
>   the specific XSS-vs-CSRF trade-off that drove that
> - Why a 7-day expiry with no refresh is the simplest thing that works
> - What we'd change if we added a third-party script or scaled past one
>   backend instance

## The problem

You log in once. Every subsequent request — REST call, WebSocket upgrade
— has to prove "I'm still that user". Two families of solution:

| Approach | Server stores | Client sends each request | Trade-off |
|---|---|---|---|
| **Sessions** (cookies + DB) | Active sessions table | `Cookie: session=abc123` | Server-side state. Revoke = `DELETE FROM sessions`. Lookup per request. |
| **JWT** (signed tokens) | Just the secret key | `Authorization: Bearer <jwt>` | Stateless. Server can't easily revoke. No lookup needed. |

For an app with one backend instance and a handful of users, either
works. JWTs feel cleaner because there's no server-side state to
synchronize — but stateless cuts both ways. If a token leaks, you can't
just delete a row. We'll get to that.

## What a JWT actually is

A JWT is three base64 strings glued with dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmMtMTIzIiwiaWF0IjoxNzE2MzAwLCJleHAiOjE3MTY5MDB9.X7w_kfM...
└───────── header ─────────┘ └──────────── payload ────────────┘ └─── signature ───┘
```

Base64-decode the three parts and you get:

**Header** — JSON: which signing algorithm, what kind of token.
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload** — JSON: arbitrary claims. Whatever the server put here.
```json
{
  "sub": "abc-123",       // subject = our user id
  "iat": 1716300,         // issued-at, unix seconds
  "exp": 1716900          // expires-at, unix seconds (= iat + 7 days)
}
```

**Signature** — HMAC-SHA-256 of `base64(header) + "." + base64(payload)`,
keyed with the server's `JWT_SECRET`.

Critical property: **the payload is not encrypted**. Anyone with the
token can base64-decode the middle part and read the claims. Don't put
secrets in the payload. The signature only proves the payload *wasn't
altered* by the client; it doesn't hide anything.

## How HS256 works

HS256 is HMAC with SHA-256 as the hash. The flow on each request:

```
   Client                          Server
     │                                │
     │  Authorization: Bearer <jwt>  │
     ├───────────────────────────────►│
     │                                │
     │                                │  Split into header.payload.signature
     │                                │
     │                                │  expected_sig = HMAC-SHA256(
     │                                │      key = JWT_SECRET,
     │                                │      data = header + "." + payload
     │                                │  )
     │                                │
     │                                │  if expected_sig != signature:  reject
     │                                │  if exp < now():               reject
     │                                │  else:                         user_id = payload.sub
     │                                │
```

The server doesn't need a session table — the token *is* the proof.
Anyone with the secret key can mint a valid token; anyone without it
can't forge one, only verify.

That's why protecting `JWT_SECRET` is the entire game. If it leaks,
attackers can mint tokens for any user id they like. Our
[scripts/deb/postinst](../../scripts/deb/postinst) generates a fresh
random 48-byte secret on every fresh install and writes it to
`/etc/voip-opus.env` with `0640` perms.

## How this app does it

Token creation, [server/auth.py:31](../../server/auth.py):

```python
def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.jwt_expires_days)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
```

Token verification — used as a FastAPI dependency, so every protected
route is just one line:

```python
@router.get("/me")
def me(user: Annotated[UserRow, Depends(get_current_user)]) -> PublicUser:
    return PublicUser.from_row(user)
```

`get_current_user` ([server/auth.py:58](../../server/auth.py)) reads the
`Authorization: Bearer …` header, decodes the JWT, looks the user up by
id, and either returns the row or raises 401.

WebSocket connections can't set `Authorization` headers (the
browser's `WebSocket` constructor doesn't expose them), so the JWT comes
in as a query string instead: `wss://example.com/ws?token=…`.
[server/ws/signaling.py](../../server/ws/signaling.py) validates it
exactly once at handshake and closes with code 1008 on failure. After
that the connection is trusted as the authenticated user.

## Where the token lives in the browser

This is where the PWA constraint changes the answer.

Two storage options:

| | `localStorage` | `httpOnly` cookie |
|---|---|---|
| Survives tab close | ✅ | ✅ |
| Survives PWA cold-start | ✅ | ✅ |
| Readable from JS (`localStorage.getItem`) | ✅ | ❌ |
| Sent automatically on every request | ❌ | ✅ |
| Vulnerable to **XSS** (script reads the token) | ✅ | ❌ |
| Vulnerable to **CSRF** (cross-site form posts your cookie) | ❌ | ✅ |

For a normal SaaS web app, the safer choice is `httpOnly` + SameSite
cookie. XSS in a typical SaaS surface area (lots of user-generated
content, lots of third-party widgets) is the more likely attack.

We picked `localStorage` anyway. The reasoning, in order of weight:

1. **There are no third-party scripts in this app.** No analytics, no
   ads, no widgets, no embedded chat. The XSS surface is exclusively
   our own code in `web/src/`. CSP is enforced by the production
   `nginx.conf`, blocking everything we don't ship ourselves. So the
   primary risk of `localStorage` — a third-party script reading the
   token — is structurally near-zero.
2. **WebSocket auth needs the token at connect time.** Cookies *do*
   work for WS upgrades on the same origin, but you can't set them
   per-connection; the cookie goes wherever the browser sends it. The
   PWA wanting to talk to a different API origin (e.g.
   `voip.devshram.com` and a hypothetical `api.devshram.com`) breaks
   `SameSite=Strict` cookies. `localStorage` + `Authorization: Bearer`
   has no such constraint.
3. **PWA standalone mode and cookies behave inconsistently** across iOS
   versions. `localStorage` has not had a single bug filed against it
   in the entire history of `kWebKit`. Boring is good.

Tradeoff accepted: if we ever add a third-party script we have to
re-evaluate, probably moving to httpOnly cookies and tolerating a
slightly more elaborate WS-upgrade handshake.

Storage code, [web/src/lib/auth.tsx:25](../../web/src/lib/auth.tsx):

```tsx
const [token, setToken] = useState<string | null>(
  typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
);
const [user, setUser] = useState<User | null>(null);

useEffect(() => {
  if (!token) return;
  api.getMe(token).then(me => setUser(me)).catch(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  });
}, [token]);
```

On mount, hydrate from `localStorage`. Verify with `GET /api/auth/me`.
If the token is expired or invalid, clear it and treat the user as
logged out. Simple.

## Why 7 days, no refresh tokens

The whole point of a "refresh token" is to give *short-lived access
tokens* (~5 minutes) so that if one leaks, the damage is bounded. The
refresh token (long-lived) is then stored more carefully (httpOnly
cookie), and the access token can live in `localStorage` or memory
without too much worry.

We skipped that ceremony because:

- **PWA UX hates re-auth.** A user opening the app on Monday after a
  week away should still be logged in. A 5-minute access token forces
  background refresh, which has to handle the network being offline,
  which adds three failure modes, which means the user occasionally
  sees a login screen when they shouldn't. 7-day tokens dodge all that.
- **Our backend has no rate-limit on `/api/auth/me`.** If access
  tokens were 5 minutes, every PWA load would hammer `/auth/me`
  immediately on token rotation. Not catastrophic, just unnecessary.
- **The blast radius of a stolen token is small.** No payments, no
  PII beyond a username and email. Revocation = bump `JWT_SECRET`,
  which logs out everyone. Acceptable for an educational tool.

If this app grew payments or sensitive PII, refresh tokens (or moving
to opaque session IDs in httpOnly cookies + DB lookup) would be the
first thing to add.

## In this codebase

| Concept | File | Line | What |
|---|---|---|---|
| `create_access_token` | [server/auth.py](../../server/auth.py) | 31 | HS256, 7-day exp, `sub = user_id`. |
| `decode_token` | [server/auth.py](../../server/auth.py) | 41 | Catches all `PyJWTError`. Returns the `sub` claim or `None`. |
| `get_current_user` FastAPI dep | [server/auth.py](../../server/auth.py) | 58 | One-liner for any protected route. |
| WS handshake auth | [server/ws/signaling.py](../../server/ws/signaling.py) | (search `?token=`) | JWT from query string, validate at upgrade, close 1008 on failure. |
| Storage in the browser | [web/src/lib/auth.tsx](../../web/src/lib/auth.tsx) | 25 | `localStorage.getItem(TOKEN_KEY)`. |
| Token attached to fetch | [web/src/lib/api.ts](../../web/src/lib/api.ts) | — | Injects `Authorization: Bearer <token>` if present. |
| Secret seeding | [scripts/deb/postinst](../../scripts/deb/postinst) | (search `JWT_SECRET`) | Generates 48 bytes of randomness on fresh install, never on upgrade. |

## ⚠️ Gotchas

- **Don't put anything sensitive in the payload.** Anyone with the
  token can read it. The `sub` is fine; PII isn't.
- **Clock skew on the server breaks `exp`.** If the server clock is
  off by more than a few seconds, valid tokens get rejected as
  expired. Run `systemd-timesyncd` on the Pi.
- **Algorithm confusion attacks.** PyJWT historically had a bug where
  passing `algorithms=['HS256']` while the token's header claimed
  `alg: none` would still verify. Modern PyJWT (we're on ≥2.12) fixes
  this. Always pass `algorithms=[...]` as a *list*, never `algorithm=`
  on `decode`.
- **`JWT_SECRET=dev-insecure-change-me` is the default in
  `.env.example`.** That's deliberate for local dev so the app runs
  out of the box. The .deb postinst generates a real secret. If you
  deploy manually (Path A or B in DEPLOY.md), you have to set it
  yourself.
- **There's no revocation list.** If a user's laptop is stolen, your
  options are: wait up to 7 days, or rotate `JWT_SECRET` (logs
  everyone out). Build a deny-list table if that's not acceptable.

## 🔧 Try it

In the browser DevTools, after logging in:

```js
const token = localStorage.getItem('voip-opus-token');
console.log(token);
```

Copy the token. Paste it at [jwt.io](https://jwt.io) — the site decodes
the three segments, shows your `sub`, `iat`, `exp`, and indicates the
signature is valid *if* you also paste your `JWT_SECRET` (don't do this
with a production secret).

Or do it from the terminal:

```bash
TOKEN="..."   # paste it
echo "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | python3 -m json.tool
# →   {"sub": "abc-123", "iat": 1716300, "exp": 1716900}
```

To watch the FastAPI dep in action: hit `/api/auth/me` with no token vs
with a token vs with a deliberately broken one. The 401/200 responses
are immediate.

## Further reading

- [RFC 7519 — *JSON Web Token*](https://datatracker.ietf.org/doc/html/rfc7519).
  The full spec is short and clear by RFC standards.
- [RFC 7515 — *JSON Web Signature*](https://datatracker.ietf.org/doc/html/rfc7515)
  covers the signature half (including the `crit` header parameter,
  which is what the PyJWT 2.12 security fix was about).
- [OWASP JWT cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
  covers the attack patterns (algorithm confusion, weak secrets, etc.).
- [Auth0 — *JWT vs cookies*](https://auth0.com/blog/cookies-vs-tokens-definitive-guide/)
  is the standard explainer of the trade-off we made.
