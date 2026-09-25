# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.1] - 2026-09-25

### Changed

- Updated Vitest to 5.0.2 and Node.js type definitions to 26.6.2.
- Retained DAT wire-protocol and CMS v1 API compatibility across the 4.7.x release line.

## [4.7.0] - 2026-08-29

### Added

- Added `syncOrThrow`, timeout options, and CMS v1 contract fixtures.

### Changed

- Hardened strict CMS response parsing, state commits, timeout cleanup, and redirect handling.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
