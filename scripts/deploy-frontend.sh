#!/usr/bin/env bash
#
# Build web/ and sync it to S3 with cache headers that won't bite you later:
#   - immutable, year-long cache for hashed assets under /assets/
#   - no-cache for the service worker and the entry HTML (so updates ship fast)
#
# Usage:
#   S3_BUCKET=my-bucket scripts/deploy-frontend.sh
#   S3_BUCKET=my-bucket CLOUDFRONT_DISTRIBUTION_ID=E... scripts/deploy-frontend.sh
#
# Requires the AWS CLI v2 with credentials available
# (`aws configure` or AWS_PROFILE/AWS_ACCESS_KEY_ID env).
#
# Works with any S3-compatible object store: set AWS_ENDPOINT_URL for
# Cloudflare R2 or Backblaze B2. Cache invalidation only runs if
# CLOUDFRONT_DISTRIBUTION_ID is set.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

: "${S3_BUCKET:?Set S3_BUCKET (the destination bucket, no s3:// prefix).}"
DIST_DIR="${DIST_DIR:-web/dist}"
EXTRA_SYNC_FLAGS="${EXTRA_SYNC_FLAGS:-}"

# Build the frontend with whatever VITE_* env is set (set them in .env or
# inline:  VITE_API_URL=https://api.example.com scripts/deploy-frontend.sh).
echo "→ Building web/..."
(cd web && npm run build)

echo "→ Uploading hashed assets with immutable cache..."
aws s3 sync "$DIST_DIR/assets/" "s3://$S3_BUCKET/assets/" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  $EXTRA_SYNC_FLAGS

echo "→ Uploading everything else..."
# Default short cache so the next deploy doesn't get stuck behind stale edge
# copies. The /assets/ folder above is overridden — Vite's hashed filenames
# are safe to cache forever.
aws s3 sync "$DIST_DIR/" "s3://$S3_BUCKET/" \
  --delete \
  --exclude "assets/*" \
  --cache-control "public, max-age=300, must-revalidate" \
  $EXTRA_SYNC_FLAGS

# Service worker + PWA manifest MUST never be cached at the CDN edge or you
# can't ship updates. Re-set their cache-control individually.
for f in sw.js registerSW.js manifest.webmanifest; do
  if [[ -f "$DIST_DIR/$f" ]]; then
    aws s3 cp "$DIST_DIR/$f" "s3://$S3_BUCKET/$f" \
      --cache-control "no-cache, no-store, must-revalidate" \
      --content-type "$(file --mime-type -b "$DIST_DIR/$f")"
  fi
done

# index.html — same idea, must not be cached or users won't see new versions.
if [[ -f "$DIST_DIR/index.html" ]]; then
  aws s3 cp "$DIST_DIR/index.html" "s3://$S3_BUCKET/index.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html; charset=utf-8"
fi

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "→ Invalidating CloudFront $CLOUDFRONT_DISTRIBUTION_ID..."
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/index.html" "/sw.js" "/registerSW.js" "/manifest.webmanifest" \
    >/dev/null
fi

echo "✓ Deployed $DIST_DIR/ → s3://$S3_BUCKET/"
