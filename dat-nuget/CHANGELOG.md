# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.1] - 2026-09-25

### Changed

- Updated Microsoft.Extensions.Logging.Abstractions to 10.0.12, Microsoft.NET.Test.Sdk to 18.10.1, and NUnit.Analyzers to 4.15.0.
- Retained DAT wire-protocol and CMS v1 API compatibility across the 4.7.x release line.

## [4.7.0] - 2026-08-29

### Added

- Added `SyncOrThrow`, `IAsyncDisposable` lifecycle support, timeout options, and CMS v1 contract fixtures.

### Changed

- Hardened strict CMS response parsing and state commits.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
