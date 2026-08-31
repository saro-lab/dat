# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.0] - 2026-08-29

### Added

- Added CMS v1 contract fixtures and configurable connection and total synchronization timeout controls.

### Changed

- Hardened strict CMS response parsing, atomic state commits, same-origin redirects, single-flight synchronization, and background-task shutdown.
- Zeroized the retained CMS authorization token when the manager is dropped.
- Added reproducible timing, parser-stress, lifecycle, and allocation-profile test runners.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.

### Fixed

- Preserved `String` invariants when Base64Url data is not UTF-8 and preserved caller output on decode failure.
- Replaced unchecked ECDSA PKCS#8 ranges with checked parsing and zeroized temporary key buffers.
