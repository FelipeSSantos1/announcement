# Team Announcements

VSCode extension that pulls internal announcements from GitHub Issues in a designated repo and surfaces only those relevant to the repo you are currently working in.

## Requirements
- [GitHub CLI (`gh`)](https://cli.github.com) installed and authenticated (`gh auth login`).

## Settings
- `announcements.repository` — e.g. `our-org/announcements`
- `announcements.label` — label filter (default `announcement`)
- `announcements.refreshInterval` — minutes between checks (default `30`)

## Commands
- `Announcements: Refresh`
- `Announcements: View All`
- `Announcements: Mark All Read`
