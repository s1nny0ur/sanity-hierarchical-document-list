# Deployment Guide

This guide explains how to publish new versions of `@considered-vision/sanity-hierarchical-document-list` to npm.

## How It Works

This project uses [semantic-release](https://semantic-release.gitbook.io/) to automate versioning and publishing. When you push to `main`, semantic-release analyzes your commit messages and automatically:

1. Determines the next version number
2. Updates `package.json`
3. Creates a git tag
4. Publishes to npm
5. Creates a GitHub release with changelog

**No manual version bumping required!**

## Prerequisites

1. **NPM_TOKEN secret** must be configured in GitHub repository settings
   - Go to Settings → Secrets and variables → Actions
   - Add a secret named `NPM_TOKEN` with your npm access token

## Commit Message Format

Semantic-release uses [Conventional Commits](https://www.conventionalcommits.org/) to determine version bumps:

### Patch Release (0.0.x) - Bug Fixes
```
fix: resolve null pointer in tree component
fix(ui): correct button alignment
```

### Minor Release (0.x.0) - New Features
```
feat: add drag-and-drop reordering
feat(api): support custom document types
```

### Major Release (x.0.0) - Breaking Changes
```
feat!: remove deprecated API methods

BREAKING CHANGE: The `oldMethod()` has been removed.
```

Or with a footer:
```
feat: redesign component API

BREAKING CHANGE: Props have been renamed for consistency.
```

### Other Commit Types (No Release)
These won't trigger a release but are good for documentation:
```
docs: update README
chore: upgrade dependencies
style: format code
refactor: simplify logic
test: add unit tests
ci: update workflow
```

## Publishing a New Version

### Automatic (Recommended)

Simply push your changes to `main`:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

Semantic-release will:
- Analyze commits since last release
- Determine if a release is needed
- Bump version and publish automatically

### Monitor the Release

1. Go to the [Actions tab](../../actions)
2. Watch the "CI & Release" workflow
3. Once complete, verify:
   - [npm package](https://www.npmjs.com/package/@considered-vision/sanity-hierarchical-document-list)
   - [GitHub Releases](../../releases)

### Manual Trigger (Fallback)

If automatic release fails or you need to force a release:

1. Go to [Actions → CI & Release](../../actions/workflows/main.yml)
2. Click "Run workflow"
3. Check ✓ "Release new version to npm"
4. Click "Run workflow"

## Examples

### Bug Fix
```bash
git commit -m "fix: handle empty document arrays gracefully"
git push origin main
# → Releases 3.0.1 (patch bump)
```

### New Feature
```bash
git commit -m "feat: add keyboard navigation support"
git push origin main
# → Releases 3.1.0 (minor bump)
```

### Breaking Change
```bash
git commit -m "feat!: require React 18+"
git push origin main
# → Releases 4.0.0 (major bump)
```

### Multiple Commits
```bash
git commit -m "fix: resolve memory leak"
git commit -m "feat: add search functionality"
git push origin main
# → Releases 3.1.0 (highest bump wins - feat > fix)
```

## Troubleshooting

### "No release published"
- Check that your commits follow the conventional format
- Only `fix:` and `feat:` trigger releases
- Commits like `chore:`, `docs:`, `style:` don't trigger releases

### "npm ERR! 403 Forbidden"
- Check that `NPM_TOKEN` secret is set correctly
- Ensure the token has publish permissions
- Verify you're a member of the `@considered-vision` npm org

### Build fails before publish
- Check the build logs in GitHub Actions
- Run `npm run build` locally to debug
- Ensure all TypeScript errors are resolved

### Version wasn't bumped correctly
Semantic-release analyzes commits since the last git tag. Ensure:
- Previous releases created proper tags (e.g., `v3.0.0`)
- You're not rewriting history after releases

## Dry Run (Local Testing)

To preview what semantic-release would do without publishing:

```bash
npx semantic-release --dry-run
```

This shows the next version and changelog without making changes.
