import React from 'react';

/**
 * Small floating badge in the bottom-right of every page showing the
 * currently-deployed version. Useful both for end users ("am I on the
 * latest release?") and for triaging bug reports ("which build was the
 * user on when they hit this?").
 *
 * The version is sourced from web/package.json at build time (see the
 * `define` block in vite.config.ts that exposes __APP_VERSION__).
 * semantic-release bumps both package.json files in lockstep on release,
 * so this stays in sync with the GitHub Release tag and the .deb version.
 *
 * Clicking the badge opens the release notes for the running version.
 *
 * z-40 (one below InstallPrompt's z-50) so the install prompt covers it
 * on first visit; harmless overlap because the install prompt is
 * dismissed once.
 */
const VersionBadge: React.FC = () => {
  const version = __APP_VERSION__;
  const releaseUrl = `https://github.com/avi892nash/voip-opus-test/releases/tag/v${version}`;

  return (
    <a
      href={releaseUrl}
      target="_blank"
      rel="noreferrer noopener"
      title={`Release notes for v${version}`}
      aria-label={`Version ${version} — open release notes in a new tab`}
      className="
        fixed bottom-2 right-2 z-40
        px-2 py-1 rounded
        font-mono text-xs
        text-gray-400 hover:text-white
        bg-gray-900/30 hover:bg-gray-900/80
        backdrop-blur-sm
        transition-colors
        select-none
      "
    >
      v{version}
    </a>
  );
};

export default VersionBadge;
