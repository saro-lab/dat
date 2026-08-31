# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.0] - 2026-08-29

### Added

- Added `sync_or_raise`, connection and synchronization timeout options, and CMS v1 contract fixtures.

### Changed

- Hardened strict CMS response parsing, state commits, and synchronization lifecycle handling.
- Made gem file selection deterministic and independent of a Git checkout.
- Kept the test dependency set compatible with the declared Ruby 2.7 runtime floor.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
