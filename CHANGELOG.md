# Changelog

All notable changes to `use-outside-click` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-31
- Development dependencies updated to latest packages.
- Went through intense testing.

## [1.0.0] - 2026-03-21

### Added
- 🎉 Initial release
- `useOutsideClick` hook — detect clicks outside of any element
- TypeScript-native types (no `@types/` package needed)
- Support for **multiple refs** via array input
- **SSR safe** — works with Next.js, Remix, Astro out of the box
- **Touch + mouse** events by default (`mousedown`, `touchstart`)
- **Capture phase** listener — works even with `stopPropagation`
- `enabled` option to temporarily disable without unmounting
- `events` option to customize which DOM events to listen to
- Stable inline handler via ref (no infinite re-subscription)
- Auto-cleanup on unmount
- Zero runtime dependencies
- ~300 bytes gzipped
- 12 unit tests with Vitest, 100% coverage
