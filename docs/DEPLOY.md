# Deploying

Three paths:

- [Path C](#path-c--single-deb-on-a-pi-behind-cloudflare-tunnel-) ⭐ —
  **single `.deb` install on a Pi behind Cloudflare Tunnel.** Backend +
  built frontend in one process, served at one origin. This is what the
  `scripts/build-deb.sh` pipeline targets.
- [Path A](#path-a--managed-services-cheapest) — managed services
  (Vercel + Fly/Render). Push to git, the platform deploys it.
- [Path B](#path-b--single-vm-one-box-full-control) — single rented VM with
  Docker + Caddy.

All paths need HTTPS in production — `navigator.mediaDevices.getUserMedia`
and the install-prompt PWA flow both refuse plain HTTP.

> **A note on Docker.** Docker isn't required for deploying this repo. The
> `docker-compose.yml` at the root is for **local dev only** — one command to
> bring up both halves. Production deploys in any of the three paths below
> can ignore it.

## Quick local check

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:5174` and verify:

- Landing → Learn → Demo work without auth.
- Sign up two users in two different browsers.
- Each user shows up in the other's "Who's online" list under `/call`.
- One calls the other; mute and hang up work.
- Click "Start a room", copy the link, paste in a third browser — all three
  should see each other.

## Path A — managed services (cheapest)

Recommended for a public demo with zero infra responsibility.

### Frontend → Vercel / Netlify / Cloudflare Pages

The whole `web/` directory is a standard Vite app.

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Env vars (build-time):**
  - `VITE_API_URL=https://api.example.com`
  - `VITE_WS_URL=wss://api.example.com`
  - `VITE_TURN_URL=turn:turn.example.com:3478` *(optional)*
  - `VITE_TURN_USERNAME=…`
  - `VITE_TURN_CREDENTIAL=…`

### Backend → Fly.io / Render / Railway

Use the `server/Dockerfile`. The image listens on `:8000` and stores SQLite at
`/data/voip.db` — mount a persistent volume there.

- **Required env:** `JWT_SECRET` (random 48+ bytes), `CORS_ORIGINS` (the public
  frontend URL).
- **Optional env:** `JWT_EXPIRES_DAYS`, `DB_PATH`.
- The platform's free-tier sleep behaviour will drop WebSocket connections —
  use a paid plan or keep-alive ping for real users.

## Path B — single VM (one box, full control)

For a small DigitalOcean / Hetzner / Linode droplet.

### 1. Install Docker + Caddy

Caddy gives you free Let's Encrypt TLS on `:443`.

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Caddy (Debian/Ubuntu)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 2. Build the images

```bash
git clone <this repo>
cd voip-opus-test
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))") \
  docker compose up -d --build
```

### 3. Caddyfile — TLS + reverse proxy

```
example.com {
    handle /api/* { reverse_proxy localhost:8000 }
    handle /ws    { reverse_proxy localhost:8000 }
    handle        { reverse_proxy localhost:5174 }
}
```

For a production build instead of the Vite dev server, build the `web/` Docker
image with `VITE_API_URL=https://example.com VITE_WS_URL=wss://example.com` and
swap the third `handle` block to point at that nginx container.

## Path C — single .deb on a Pi behind Cloudflare Tunnel ⭐

**The supported "everything in one place" path.** One `.deb` package installs:

- The FastAPI backend at `/opt/voip-opus/`
- The built React PWA at `/opt/voip-opus/web-dist/` (served by the same
  FastAPI process — no separate frontend host, no S3)
- A `voip-opus` system user + systemd unit
- A conffile env at `/etc/voip-opus.env` with a freshly-generated JWT secret

The process listens on `127.0.0.1:8000`. Your existing Cloudflare Tunnel
routes the public hostname to that loopback address. HTTPS is terminated by
Cloudflare, so the browser sees a secure context and the mic API works.

### 1. Install

SSH into the Pi and run:

```bash
curl -fsSL https://github.com/avi892nash/voip-opus-test/releases/latest/download/voip-opus.deb \
  -o /tmp/voip-opus.deb
sudo apt install /tmp/voip-opus.deb
```

That's it. The release pipeline uploads each new build under the same
stable filename (`voip-opus.deb`), so `releases/latest/download/` always
points at the newest one. Only dependency is `curl`.

The `apt install` runs `postinst` which:

- Creates the `voip-opus` system user
- Builds `/opt/voip-opus/.venv` and installs Python deps (so wheels match
  the Pi's CPU, not the build runner's)
- Generates a fresh `JWT_SECRET` in `/etc/voip-opus.env`
- `mkdir /var/lib/voip-opus`
- `systemctl daemon-reload && systemctl enable --now voip-opus`
- Wires up `voip-opus-update.timer` so future releases install themselves
  within ~30 minutes — you never run this command again

### 2. Verify

```bash
systemctl status voip-opus
journalctl -u voip-opus -f
curl -i http://127.0.0.1:8000/api/health    # → {"status":"ok"}
curl -I http://127.0.0.1:8000/              # → 200, serves index.html
```

If `api/health` 404s or returns nothing, check `journalctl -u voip-opus
-n 100`. The most common first-install issue is the Python venv failing
to build because `python3-venv` isn't installed; the postinst will say
so explicitly.

### 3. Build from source (alternative)

Use this when you've made un-released changes you want to test on the
Pi, or when the Pi has no internet egress.

Build-machine prerequisites:

```bash
# Node + npm for the frontend build:
node --version    # >= 20

# fpm (Ruby tool for building .deb / .rpm):
gem install --no-document fpm
# or:  brew install fpm        # macOS
# or:  apt install ruby-dev && gem install fpm   # Debian/Ubuntu
```

Build, copy across, install. The build is `Architecture: all`, so you
can build on a Mac, a Linux laptop, or another Pi — wheels are resolved
at install time on the target:

```bash
scripts/build-deb.sh
# → dist/voip-opus_X.Y.Z+sha_all.deb   (X.Y.Z from package.json)

scp dist/voip-opus_*_all.deb pi@your-pi:/tmp/
ssh pi@your-pi
sudo apt install -y /tmp/voip-opus_*_all.deb
```

Same `postinst` runs (system user, venv, JWT secret, systemd enable,
auto-update timer).

### 4. Point Cloudflare Tunnel at it

In your Cloudflare Zero Trust dashboard (or `cloudflared` config), add an
ingress rule for the hostname you want to serve this from:

```yaml
# Append to your existing /etc/cloudflared/config.yml, BEFORE the catch-all.
ingress:
  - hostname: voip.devshram.com
    service: http://127.0.0.1:8000
  # ... your existing 'thor' rule continues here ...
  - service: http_status:404
```

`cloudflared service restart` (or `systemctl reload cloudflared`).

The shipped `/etc/voip-opus.env` already has
`CORS_ORIGINS=https://voip.devshram.com` as its default, so no edit needed.
If you serve from a different hostname, edit the file and `systemctl
restart voip-opus`.

Open `https://voip.devshram.com` — same origin serves the PWA, the API, and
the WebSocket. The browser sees HTTPS, mic permission works.

### 5. Upgrades — automatic by default

The .deb ships a small auto-updater. After install you'll have:

- `/usr/bin/voip-opus-update` — polls GitHub for the latest release.
- `voip-opus-update.service` — systemd oneshot that runs that script.
- `voip-opus-update.timer` — fires the service every **30 minutes**
  (5 minutes after boot, then every 30 minutes with up to 5 minutes of
  jitter so a fleet of Pis doesn't all hit the API at the same second).

When a new GitHub release is published:

1. Within ~30 minutes, the timer fires.
2. The script reads `/var/lib/voip-opus/installed-tag`, compares it to
   the tag on `releases/latest`, and if they differ, downloads the
   attached `voip-opus.deb` (or any `voip-opus*.deb` for older
   releases — the script tolerates both naming schemes) and runs
   `apt install`.
3. `apt install` runs `postinst` again — restarts `voip-opus.service`,
   re-runs the venv install (picks up new Python deps), preserves
   `/etc/voip-opus.env` (conffile).

Manual control:

```bash
# Force a check right now (helpful for testing)
sudo systemctl start voip-opus-update.service
sudo journalctl -t voip-opus-update -f

# See when it'll fire next
systemctl list-timers voip-opus-update.timer

# Disable auto-update (revert to manual upgrades)
sudo systemctl disable --now voip-opus-update.timer
```

If you'd rather upgrade manually, disable the timer and re-run the
same one-liner from §1 — it always downloads the latest. Or for a
specific older release:

```bash
gh release download vX.Y.Z -p 'voip-opus*.deb' -R avi892nash/voip-opus-test
sudo apt install ./voip-opus*.deb
```

The conffile preserves your `JWT_SECRET` across upgrades.

### 6. Backups (3-2-1 in three small steps)

The two cron jobs below give you **three copies** of the data (live, local,
remote) on **two media** (NVMe, USB / cloud) with **one off-site**.

```bash
# Daily local snapshot to an attached USB drive.
# Edit BACKUP_DIR to point at your mount.
echo '5 3 * * * voip-opus BACKUP_DIR=/mnt/usb/backups /srv/voip-opus/scripts/backup.sh' \
  | sudo tee /etc/cron.d/voip-opus-backup

# Nightly off-site push of those snapshots (rclone configured separately).
echo '30 3 * * * voip-opus rclone sync /mnt/usb/backups/ encrypted-remote:voip-opus/' \
  | sudo tee /etc/cron.d/voip-opus-offsite
```

The provided `scripts/backup.sh`:
- Uses SQLite's `.backup` command (WAL-aware — safe with the server running).
- Compresses with gzip and timestamps the filename.
- Rotates: deletes backups older than `BACKUP_KEEP_DAYS` (default 14).

To restore (after a disaster, or just to verify backups quarterly):

```bash
sudo systemctl stop voip-opus
sudo /opt/voip-opus/scripts/restore.sh /mnt/usb/backups/voip-20260520T030500Z.db.gz
sudo systemctl start voip-opus
```

(The `scripts/` directory is not currently shipped inside the .deb — copy
`scripts/backup.sh` and `scripts/restore.sh` onto the Pi separately, set
their `DB_PATH` to `/var/lib/voip-opus/voip.db`.)

`restore.sh` refuses to run while the service is up, moves the current DB
aside to `voip.db.pre-restore-<timestamp>` rather than overwriting, then
restores atomically (temp file + rename) and verifies the user count.

### 7. Test the backup once before you need it

```bash
# Take a backup
sudo -u voip-opus /srv/voip-opus/scripts/backup.sh /tmp/backup-test
ls -lh /tmp/backup-test

# Try restoring it onto a scratch copy
cp /tmp/backup-test/voip-*.db.gz /tmp/dr.db.gz
gunzip /tmp/dr.db.gz
sqlite3 /tmp/dr.db "SELECT count(*) FROM users;"
```

Untested backups have a way of being broken backups. Run this once after the
initial setup, then re-run quarterly.

## TURN server (optional, for any path)

Browsers behind symmetric NATs cannot establish a peer connection with STUN
alone. Pick one:

- **Managed TURN** (easiest): Metered.ca, Twilio, Xirsys. Paste the issued URL +
  credentials into the `VITE_TURN_*` env vars at frontend build time.
- **Self-hosted coturn:**

  ```bash
  sudo apt install coturn
  sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
  sudo tee /etc/turnserver.conf <<EOF
  listening-port=3478
  fingerprint
  lt-cred-mech
  user=demo:$(openssl rand -hex 12)
  realm=example.com
  EOF
  sudo systemctl enable --now coturn
  ```

  Then set `VITE_TURN_URL=turn:example.com:3478` + matching username +
  credential at frontend build time.

## Checklist before going public

- [ ] `JWT_SECRET` is a fresh random value, not the default.
- [ ] `CORS_ORIGINS` is restricted to your real frontend origin (no `*`).
- [ ] Frontend served over HTTPS.
- [ ] WS endpoint reachable as `wss://…`.
- [ ] Backups configured **and tested at least once** (Path C: `scripts/backup.sh`
      runs via cron; `scripts/restore.sh` verified manually).
- [ ] Run `pytest server/tests/` against the deployed image / Pi one more time.
