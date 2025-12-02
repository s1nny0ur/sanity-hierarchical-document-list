<!-- markdownlint-disable --><!-- textlint-disable -->

# 📓 Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 3.1.0 (2025-12-02)

- fix: add missing computePaths utility file ([7a2df12](https://github.com/s1nny0ur/sanity-hierarchical-document-list/commit/7a2df12))
- Merge branch 'main' of github.com:s1nny0ur/sanity-hierarchical-document-list ([a40a64b](https://github.com/s1nny0ur/sanity-hierarchical-document-list/commit/a40a64b))
- feat: add page change callback functionality for studio consumption ([515f424](https://github.com/s1nny0ur/sanity-hierarchical-document-list/commit/515f424))

## <small>3.0.1 (2025-12-01)</small>

- fix: lint errors preventing build ([f98c258](https://github.com/s1nny0ur/sanity-hierarchical-document-list/commit/f98c258))
- fix: remove registry-url to let semantic-release handle npm auth ([2969bce](https://github.com/s1nny0ur/sanity-hierarchical-document-list/commit/2969bce))
- fix: smooth drag mechanics and versioning set up ([157923b](https://github.com/s1nny0ur/sanity-hierarchical-document-list/commit/157923b))

## [3.0.0](https://github.com/s1nny0ur/sanity-hierarchical-document-list/releases/tag/v3.0.0) (2025-12-01)

### ⚠ BREAKING CHANGES

- Replaced `@nosferatu500/react-sortable-tree` with a custom dnd-kit-based tree view.
- Removed `react-dnd` and `react-dnd-html5-backend` dependencies.

### Features

- **dnd-kit:** Implemented custom tree view using `@dnd-kit/core` and `@dnd-kit/sortable`.
- **tree:** Added new `SortableTree` component with drag-and-drop reordering.
- **tree:** Support for changing parent relationships (nesting) via drag-and-drop.
- **tree:** Maintained expand/collapse behaviour.
- **tree:** Created utility functions for tree operations (`flatDataToTree`, `getFlatDataFromTree`, `getVisibleNodeCount`, `isDescendant`).

### Notes

- No public API changes expected; behaviour should be equivalent or improved.
- This is a fork of `@sanity/hierarchical-document-list` with maintained dependencies.

---

## [2.1.2](https://github.com/sanity-io/hierarchical-document-list/compare/v2.1.1...v2.1.2) (2025-07-10)

### Bug Fixes

- **deps:** allow studio v4 peer dep ranges ([5952cab](https://github.com/sanity-io/hierarchical-document-list/commit/5952cab90e46584df92bf1af4adb2720010e1c8a))

## [2.1.1](https://github.com/sanity-io/hierarchical-document-list/compare/v2.1.0...v2.1.1) (2025-03-07)

### Bug Fixes

- **deps:** inline `@nosferatu500/react-sortable-tree` ([78b804a](https://github.com/sanity-io/hierarchical-document-list/commit/78b804a2a79bef520e8d3f552c7a552acb1666a5))

## [2.1.0](https://github.com/sanity-io/hierarchical-document-list/compare/v2.0.1...v2.1.0) (2025-03-07)

### Features

- add react 19 to peer deps ([fb26e2c](https://github.com/sanity-io/hierarchical-document-list/commit/fb26e2ca69be4b0f098520204748f8572a413162))

### Bug Fixes

- correctly calculate tree height ([3b06256](https://github.com/sanity-io/hierarchical-document-list/commit/3b06256392e866b5fcc39b70b5910990321d10d8))

## [2.0.1](https://github.com/sanity-io/hierarchical-document-list/compare/v2.0.0...v2.0.1) (2025-03-07)

### Bug Fixes

- upgrade `@sanity/ui` ([8df02c0](https://github.com/sanity-io/hierarchical-document-list/commit/8df02c05cf9a69254268b307d4a0cc294c3f0a56))

## [2.0.0](https://github.com/sanity-io/hierarchical-document-list/compare/v1.1.0...v2.0.0) (2023-12-04)

### ⚠ BREAKING CHANGES

- migrate to v3 (#15)

### Features

- migrate to v3 ([#15](https://github.com/sanity-io/hierarchical-document-list/issues/15)) ([7e2abb7](https://github.com/sanity-io/hierarchical-document-list/commit/7e2abb7c3eee9c532976ce6e17ce7255b47227fe))

### Bug Fixes

- validates that S and context props are passed as config to createDeskHierarchy ([d781809](https://github.com/sanity-io/hierarchical-document-list/commit/d781809e3e970968254b621078658538188b08ae))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.1.0](https://github.com/sanity-io/hierarchical-document-list/compare/v1.0.0...v1.1.0) (2022-03-18)

### Features

- types are now correctly bundled ([50ecd09](https://github.com/sanity-io/hierarchical-document-list/commit/50ecd0974af5bf09f17ee2e73d64e8db74701e42))

### Bug Fixes

- multiple createDeskHierarchy in a studio now works correctly ([7283c4c](https://github.com/sanity-io/hierarchical-document-list/commit/7283c4c56dad3a845eff93ae112c9b43238cf612))
