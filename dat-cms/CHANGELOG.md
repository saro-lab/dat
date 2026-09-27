# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Fixed the container HTTP port at 80, independent of `PORT`; standalone binaries retain their configurable port with an 8088 default.
- Granted the container binary `NET_BIND_SERVICE` so the non-root user can bind to port 80.
- Corrected Docker/Podman port mappings, Kubernetes service ports and probes, and website deployment examples.
- Restored automatic SQLite parent-directory creation and provided a writable `/data` directory in the non-root container image so startup works without `DB_URI`.

## [4.7.1] - 2026-09-25

### Changed

- Updated the CMS server version and deployment examples to 4.7.1.
- Retained DAT wire-protocol and CMS v1 API compatibility with the 4.7.x release line.

## [4.7.0] - 2026-08-29

### Added

- Added cache snapshots with monotonic freshness checks, serialized refreshes, and last-known-good fallback on refresh failure.
- Added transactional certificate registration and cache invalidation after commit.
- Added an injectable application/certificate-service state and configurable database query timeout.
- Added a pinned scratch-based container image that runs as a non-root user.

### Changed

- Hardened corrupt-row reporting, structured error responses, certificate-registration failure handling, and server logging.
- Added bounded retry for database transaction deadlocks and serialization conflicts during concurrent certificate registration.
- Prevented a cache read/write lock self-deadlock while returning a last-known-good snapshot.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
