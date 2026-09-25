# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.1] - 2026-09-25

### Changed

- Updated Kotlin to 2.4.20, Gradle to 9.8.0, Bouncy Castle to 1.86, SLF4J to 2.0.20, and Logback to 1.6.4.
- Retained DAT wire-protocol and CMS v1 API compatibility across the 4.7.x release line.

## [4.7.0] - 2026-08-29

### Added

- Added `syncOrThrow`, `AutoCloseable` lifecycle support, request-timeout options, and CMS v1 contract fixtures.

### Changed

- Hardened strict CMS response parsing, state commits, and close behavior.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
