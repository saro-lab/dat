# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.7.0] - 2026-08-29

### Added

- Added `dat_cms_manager_options_t` and `dat_cms_manager_create_with_options` for configurable connection and total timeouts.
- Added dynamic CMS URL and Authorization request construction with strict ASCII response validation and unsigned decimal version handling.

### Changed

- Hardened interruptible shutdown and synchronization to avoid background-thread teardown races; CMS HTTP redirects remain disabled for the C transport.
- Retained DAT wire-protocol and CMS v1 compatibility, including existing error codes and response-body behavior.
