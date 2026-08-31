# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.0] - 2026-08-29

### Added

- Added cache snapshots with monotonic freshness checks, serialized refreshes, and last-known-good fallback on refresh failure.
- Added transactional certificate registration and cache invalidation after commit.
- Added an injectable application/certificate-service state and configurable database query timeout.
- Added a pinned scratch-based container image that runs as a non-root user on port 8088.

### Changed

- Hardened corrupt-row reporting, structured error responses, certificate-registration failure handling, and server logging.
- Added bounded retry for database transaction deadlocks and serialization conflicts during concurrent certificate registration.
- Prevented a cache read/write lock self-deadlock while returning a last-known-good snapshot.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
