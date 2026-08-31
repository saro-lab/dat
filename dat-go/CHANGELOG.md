# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.0] - 2026-08-29

### Added

- Added CMS v1 contract fixtures and configurable connection and request timeouts.

### Changed

- Hardened strict CMS response parsing, atomic state commits, same-origin redirects, and close-safe background synchronization.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
