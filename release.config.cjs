// semantic-release config.
//
// Triggered from .github/workflows/ci.yml on every push to master. Walks the
// conventional commits since the last tag, decides the next semver bump,
// updates package.json + web/package.json, writes a changelog, commits +
// tags, creates a GitHub Release, and attaches the .deb produced by the
// preceding build-deb job.

module.exports = {
  branches: ['master'],
  plugins: [
    // Analyze conventional commits → next semver bump.
    '@semantic-release/commit-analyzer',

    // Build the human-readable release notes from those commits.
    '@semantic-release/release-notes-generator',

    // Maintain CHANGELOG.md.
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],

    // Bump version in root package.json AND web/package.json (we keep them
    // in lock-step so `web/` reports the same version to users via the PWA
    // build). `npmPublish: false` because this isn't an npm package.
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
        pkgRoot: 'web',
      },
    ],

    // Commit the version bump + changelog back to master. The `[skip ci]`
    // suffix prevents this commit from re-triggering CI in a loop.
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', 'web/package.json', 'web/package-lock.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],

    // Create the GitHub Release with notes + attach the prebuilt .deb that
    // the build-deb job uploaded as an artifact.
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'dist/voip-opus_*_all.deb',
            label: 'voip-opus .deb (any architecture)',
          },
        ],
      },
    ],
  ],
};
