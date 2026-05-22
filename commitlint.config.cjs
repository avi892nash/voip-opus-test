// Conventional commits, used by:
//   - PR CI (.github/workflows/ci.yml → commitlint job)
//   - semantic-release on push to main, to compute the next semver bump
//
// Allowed types: feat, fix, perf, refactor, docs, test, build, ci, chore, revert.
// `feat:` → minor bump; `fix:`/`perf:` → patch; `BREAKING CHANGE:` footer → major.

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Dependabot's PR body embeds a markdown table of bumped packages with
    // long URLs that routinely exceed 100 chars. The CI skip in ci.yml
    // already bypasses commitlint for dependabot[bot]-authored runs, but
    // the rule still trips when a human force-pushes to a dependabot
    // branch (then github.actor != dependabot[bot] and the lint walks
    // every commit in the PR, including dependabot's). The 100-char body
    // limit is stylistic — semantic-release reads only the header.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
