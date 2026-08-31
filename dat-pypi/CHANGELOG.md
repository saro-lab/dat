# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.0] - 2026-08-29

### Added

- Added `sync_or_raise`, connection and synchronization timeout options, and CMS v1 contract fixtures.

### Changed

- Hardened canonical Base64Url and CMS response parsing, including truncated-body transport failures.
- Cleared stopped background timer references while preserving the documented `urllib` in-flight cancellation limit.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
