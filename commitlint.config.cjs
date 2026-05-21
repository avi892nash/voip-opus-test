// Conventional commits, used by:
//   - PR CI (.github/workflows/ci.yml → commitlint job)
//   - semantic-release on push to main, to compute the next semver bump
//
// Allowed types: feat, fix, perf, refactor, docs, test, build, ci, chore, revert.
// `feat:` → minor bump; `fix:`/`perf:` → patch; `BREAKING CHANGE:` footer → major.

module.exports = {
  extends: ['@commitlint/config-conventional'],
};
