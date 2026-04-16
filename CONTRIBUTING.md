# Contributing

Thanks for your interest in improving **Team Announcements**! This document covers how to get set up, the conventions we follow, and how to submit changes.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Getting started

Prerequisites:

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [GitHub CLI](https://cli.github.com/) authenticated (`gh auth login`) — required at runtime
- VSCode 1.85+

Clone and install:

```bash
git clone https://github.com/FelipeSSantos1/announcement.git
cd announcement
pnpm install
```

Launch the extension in a debug window:

1. Open the repo in VSCode.
2. Press `F5` (runs the `Run Extension` launch configuration).
3. A second VSCode window opens with the extension loaded.

## Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm run build` | Bundle the extension with esbuild (production). |
| `pnpm run watch` | Rebuild on file changes. |
| `pnpm run lint` | Run Biome lint + `tsc --noEmit`. |
| `pnpm run lint:fix` | Auto-fix what Biome can. |
| `pnpm run check` | Biome formatter + lint together. |
| `pnpm run typecheck` | Type-check only. |
| `pnpm test` | Compile tests and run the Mocha suite. |
| `pnpm run package` | Produce a `.vsix` via `vsce`. |

## Branching & commits

- Branch off `main`.
- Use short, descriptive branch names (e.g. `fix/status-bar-flicker`, `feat/per-repo-mute`).
- Keep commits focused. Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) are preferred but not strictly enforced.

## Pull requests

Before opening a PR:

1. `pnpm run lint` passes.
2. `pnpm test` passes.
3. You've updated [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]` if your change is user-visible.
4. If you changed behavior documented in [README.md](README.md), update it too.

Open the PR against `main`. CI will run lint, typecheck, tests, and package the `.vsix`.

## Reporting bugs / requesting features

Use the [issue templates](https://github.com/FelipeSSantos1/announcement/issues/new/choose). Include your VSCode version, OS, and `gh --version` output for bugs.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
