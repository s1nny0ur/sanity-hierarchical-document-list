# Deployment Guide

This guide explains how to publish new versions of `@considered-vision/sanity-hierarchical-document-list` to npm.

## Prerequisites

1. **NPM_TOKEN secret** must be configured in GitHub repository settings
   - Go to Settings → Secrets and variables → Actions
   - Add a secret named `NPM_TOKEN` with your npm access token

## Publishing a New Version

### 1. Update the version in package.json

```bash
# For a patch release (bug fixes)
npm version patch

# For a minor release (new features, backwards compatible)
npm version minor

# For a major release (breaking changes)
npm version major
```

This will:
- Update the version in `package.json`
- Create a git commit
- Create a git tag (e.g., `v3.0.1`)

### 2. Push the tag to trigger the release

```bash
git push origin main --follow-tags
```

Or push the tag separately:

```bash
git push origin v3.0.1
```

### 3. Monitor the release

1. Go to the [Actions tab](../../actions)
2. Watch the "CI & Release" workflow
3. Once complete, verify the package on [npm](https://www.npmjs.com/package/@considered-vision/sanity-hierarchical-document-list)

## Manual Release (Fallback)

If tag-based release fails, you can trigger manually:

1. Go to [Actions → CI & Release](../../actions/workflows/main.yml)
2. Click "Run workflow"
3. Check ✓ "Release new version to npm"
4. Click "Run workflow"

## Version Naming

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, backwards compatible

## Troubleshooting

### "npm ERR! 403 Forbidden"
- Check that `NPM_TOKEN` secret is set correctly
- Ensure the token has publish permissions
- Verify you're a member of the `@considered-vision` npm org

### Build fails before publish
- Check the build logs in GitHub Actions
- Run `npm run build` locally to debug
- Ensure all TypeScript errors are resolved

### Tag already exists
```bash
# Delete local tag
git tag -d v3.0.0

# Delete remote tag
git push origin :refs/tags/v3.0.0

# Create new tag
git tag v3.0.0
git push origin v3.0.0
```
