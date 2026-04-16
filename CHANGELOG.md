# Changelog

All notable changes to the **Team Announcements** extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-16

### Added

- Initial release.
- Detect current repository from the active workspace's git remote.
- Fetch open issues labeled `announcement` via the GitHub CLI (`gh`).
- Status bar item showing unread announcement count.
- Notification for new unread announcements.
- Commands: `Announcements: Refresh`, `Announcements: View All`, `Announcements: Mark All Read`.
- Configurable label (`announcements.label`) and refresh interval (`announcements.refreshInterval`).

[Unreleased]: https://github.com/FelipeSSantos1/announcement/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FelipeSSantos1/announcement/releases/tag/v0.1.0
