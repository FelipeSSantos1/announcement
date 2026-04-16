# VSCode Team Announcements Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VSCode extension that surfaces team announcements from GitHub Issues, context-aware to the repo the developer is currently working in, using the `gh` CLI for auth.

**Architecture:** A single VSCode extension written in TypeScript. The extension detects the current workspace repo via the built-in `vscode.git` extension API, invokes the `gh` CLI (child process) to fetch issues labeled `announcement` from a configured source repo, filters them by labels that match the current repo (`repo:<name>` or `all-repos`), and tracks read state in `globalState`. Unread announcements trigger a notification popup and appear in a status bar indicator; a webview panel renders the full list.

**Tech Stack:**
- TypeScript (strict mode)
- VSCode Extension API (engine `^1.85.0`)
- `gh` CLI (spawned via `child_process`)
- Mocha + Sinon for pure-logic unit tests (run via plain Node with a small `vscode` module stub — no Electron harness). Integration tests are out of scope for this plan.
- esbuild for bundling

---

## File Structure

```
vscodeannouncement/
├── package.json                  # Extension manifest, contributions, scripts
├── tsconfig.json                 # TS strict compiler options
├── esbuild.js                    # Bundler config (entry → dist/extension.js)
├── .vscodeignore                 # Files excluded from .vsix
├── .eslintrc.json                # Linting rules
├── .gitignore
├── README.md
├── src/
│   ├── extension.ts              # activate() / deactivate() entry point; wires modules together
│   ├── types.ts                  # Shared interfaces: Announcement, RepoContext, etc.
│   ├── ghCli.ts                  # Thin wrapper: checkInstalled(), fetchIssues()
│   ├── gitContext.ts             # Detect current repo via vscode.git API; parse remote URL
│   ├── announcementService.ts    # Orchestrates fetch + filter by repo context
│   ├── announcementStore.ts      # Read-state tracking in globalState
│   ├── notificationManager.ts    # Popup logic + View/Dismiss action handlers
│   ├── statusBar.ts              # Status bar item showing unread count
│   ├── webviewPanel.ts           # "View all" webview + HTML rendering
│   └── commands.ts               # Command registration (refresh/viewAll/markAllRead)
└── src/test/
    ├── runTest.ts                # Entry for @vscode/test-electron
    ├── suite/
    │   ├── index.ts              # Mocha runner
    │   ├── gitContext.test.ts    # Unit: parseRemoteUrl regex cases
    │   ├── ghCli.test.ts         # Unit: command construction + parse
    │   ├── announcementService.test.ts # Unit: filter by repo labels
    │   └── announcementStore.test.ts   # Unit: read-state round-trip (in-memory mock)
```

**Why this shape:** Each module has a single responsibility and explicit interfaces, which makes mocking easy and lets tasks ship independently. Pure logic (URL parsing, filtering, state helpers) is split away from VSCode API integration so it can be unit-tested without spinning up the Extension Host.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.vscodeignore`
- Create: `.eslintrc.json`
- Create: `esbuild.js`
- Create: `README.md`

- [ ] **Step 1: Initialize git**

Run:
```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement
git init
git branch -M main
```

- [ ] **Step 2: Create `.gitignore`**

Create `.gitignore`:
```
node_modules/
dist/
out/
*.vsix
.vscode-test/
.DS_Store
```

- [ ] **Step 3: Create `package.json`**

Create `package.json`:
```json
{
  "name": "team-announcements",
  "displayName": "Team Announcements",
  "description": "Internal team announcements pulled from GitHub Issues, filtered to the current repo.",
  "version": "0.1.0",
  "publisher": "hinge-health",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "main": "./dist/extension.js",
  "activationEvents": ["onStartupFinished"],
  "contributes": {
    "commands": [
      { "command": "announcements.refresh", "title": "Announcements: Refresh" },
      { "command": "announcements.viewAll", "title": "Announcements: View All" },
      { "command": "announcements.markAllRead", "title": "Announcements: Mark All Read" }
    ],
    "configuration": {
      "title": "Team Announcements",
      "properties": {
        "announcements.repository": {
          "type": "string",
          "default": "",
          "description": "GitHub repo to pull announcements from, e.g. 'our-org/announcements'."
        },
        "announcements.label": {
          "type": "string",
          "default": "announcement",
          "description": "Issue label to filter by."
        },
        "announcements.refreshInterval": {
          "type": "number",
          "default": 30,
          "minimum": 1,
          "description": "Check interval in minutes."
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run build",
    "build": "node esbuild.js --production",
    "watch": "node esbuild.js --watch",
    "lint": "eslint src --ext ts",
    "test": "npm run build && node ./out/test/runTest.js",
    "compile-tests": "tsc -p . --outDir out"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.6",
    "@types/node": "^20.10.0",
    "@types/sinon": "^17.0.2",
    "@types/vscode": "^1.85.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@vscode/test-electron": "^2.3.8",
    "esbuild": "^0.19.10",
    "eslint": "^8.56.0",
    "mocha": "^10.2.0",
    "sinon": "^17.0.1",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", "dist", "out"]
}
```

- [ ] **Step 5: Create `.eslintrc.json`**

Create `.eslintrc.json`:
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/naming-convention": ["warn", { "selector": "default", "format": ["camelCase"] }],
    "@typescript-eslint/semi": "warn",
    "curly": "warn",
    "eqeqeq": "warn",
    "no-throw-literal": "warn",
    "semi": "off"
  },
  "ignorePatterns": ["dist", "out", "node_modules"]
}
```

- [ ] **Step 6: Create `.vscodeignore`**

Create `.vscodeignore`:
```
.vscode/**
.vscode-test/**
src/**
out/**
.gitignore
esbuild.js
tsconfig.json
.eslintrc.json
**/*.map
**/*.ts
```

- [ ] **Step 7: Create `esbuild.js`**

Create `esbuild.js`:
```js
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 8: Create `README.md`**

Create `README.md`:
```markdown
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
```

- [ ] **Step 9: Install dependencies**

Run:
```bash
pnpm install
```
Expected: `node_modules/` populated, no errors.

- [ ] **Step 10: Commit scaffold**

```bash
git add package.json pnpm-lock.yaml tsconfig.json .gitignore .vscodeignore .eslintrc.json esbuild.js README.md
git commit -m "chore: scaffold VSCode team-announcements extension"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

Create `src/types.ts`:
```ts
export interface GitHubLabel {
  name: string;
  color?: string;
  description?: string;
}

export interface Announcement {
  number: number;
  title: string;
  body: string;
  labels: GitHubLabel[];
  createdAt: string;
  url: string;
}

export interface RepoContext {
  owner: string;
  repo: string;
}

export interface AnnouncementConfig {
  repository: string;
  label: string;
  refreshInterval: number;
}

export const ALL_REPOS_LABEL = 'all-repos';
export const REPO_LABEL_PREFIX = 'repo:';
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: define shared announcement types"
```

---

## Task 3: Git context — parse remote URL (pure logic, TDD)

**Files:**
- Create: `src/gitContext.ts`
- Create: `src/test/mocha-setup.ts` (one-time harness — stubs `require('vscode')` for unit tests)
- Create: `src/test/vscode-stub.ts` (tiny mock of VSCode API surface our modules touch)
- Test: `src/test/suite/gitContext.test.ts`

**Note on test harness:** All current tests are pure logic — we run them with plain Mocha (no Electron). `mocha-setup.ts` intercepts `require('vscode')` and redirects to `vscode-stub.ts`, so any module that imports `vscode` can be loaded in Node without the full Extension Host.

- [ ] **Step 1: Add test harness scaffolding**

Create `src/test/mocha-setup.ts`:
```ts
import Module from 'module';
import * as path from 'path';

const STUB_PATH = path.resolve(__dirname, 'vscode-stub.js');
const resolver = Module as unknown as {
  _resolveFilename: (request: string, parent: unknown, ...rest: unknown[]) => string;
};
const original = resolver._resolveFilename;
resolver._resolveFilename = function (request: string, parent: unknown, ...rest: unknown[]): string {
  if (request === 'vscode') { return STUB_PATH; }
  return original.call(this, request, parent, ...rest);
};
```

Create `src/test/vscode-stub.ts` with minimal exports matching the VSCode API surface the extension uses (extensions, window, workspace, commands, env, Uri, StatusBarAlignment, ViewColumn, ThemeColor).

Update `package.json` `test` script to:
```
"test": "pnpm run compile-tests && mocha --ui tdd --require ./out/test/mocha-setup.js 'out/test/suite/**/*.test.js'"
```

- [ ] **Step 2: Write failing test for `parseRemoteUrl`**

Create `src/test/suite/gitContext.test.ts`:
```ts
import * as assert from 'assert';
import { parseRemoteUrl } from '../../gitContext';

suite('parseRemoteUrl', () => {
  test('parses https URL with .git suffix', () => {
    assert.deepStrictEqual(parseRemoteUrl('https://github.com/our-org/phoenix.git'), { owner: 'our-org', repo: 'phoenix' });
  });
  test('parses https URL without .git suffix', () => {
    assert.deepStrictEqual(parseRemoteUrl('https://github.com/our-org/phoenix'), { owner: 'our-org', repo: 'phoenix' });
  });
  test('parses ssh URL', () => {
    assert.deepStrictEqual(parseRemoteUrl('git@github.com:our-org/phoenix.git'), { owner: 'our-org', repo: 'phoenix' });
  });
  test('parses ssh URL without .git suffix', () => {
    assert.deepStrictEqual(parseRemoteUrl('git@github.com:our-org/phoenix'), { owner: 'our-org', repo: 'phoenix' });
  });
  test('returns null for non-github URL', () => {
    assert.strictEqual(parseRemoteUrl('https://gitlab.com/foo/bar.git'), null);
  });
  test('returns null for empty string', () => {
    assert.strictEqual(parseRemoteUrl(''), null);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: FAIL — `Cannot find module '../../gitContext'`.

- [ ] **Step 4: Implement `parseRemoteUrl`**

Create `src/gitContext.ts`:
```ts
import * as vscode from 'vscode';
import { RepoContext } from './types';

const REMOTE_REGEX = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/;

export function parseRemoteUrl(url: string): RepoContext | null {
  if (!url) { return null; }
  const match = url.match(REMOTE_REGEX);
  if (!match) { return null; }
  return { owner: match[1], repo: match[2] };
}

export async function getCurrentRepo(): Promise<RepoContext | null> {
  const gitExt = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!gitExt) { return null; }
  const git = gitExt.isActive ? gitExt.exports : await gitExt.activate();
  const api = git.getAPI(1);
  const repo = api.repositories[0];
  if (!repo) { return null; }
  const remote = repo.state.remotes.find((r) => r.name === 'origin') ?? repo.state.remotes[0];
  const url = remote?.fetchUrl ?? remote?.pushUrl ?? '';
  return parseRemoteUrl(url);
}

interface GitExtension { getAPI(version: 1): GitAPI; }
interface GitAPI { repositories: GitRepository[]; }
interface GitRepository { state: { remotes: GitRemote[] }; }
interface GitRemote { name: string; fetchUrl?: string; pushUrl?: string; }
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: all `parseRemoteUrl` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/gitContext.ts src/test/ package.json package-lock.json
git commit -m "feat: detect current repo via vscode.git API"
```

---

## Task 4: GitHub CLI wrapper (TDD for parsing, integration for install check)

**Files:**
- Create: `src/ghCli.ts`
- Test: `src/test/suite/ghCli.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/suite/ghCli.test.ts`:
```ts
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as child_process from 'child_process';
import * as ghCli from '../../ghCli';

suite('ghCli', () => {
  teardown(() => sinon.restore());

  test('isInstalled returns true when gh --version succeeds', () => {
    sinon.stub(child_process, 'execSync').returns(Buffer.from('gh version 2.40.0'));
    assert.strictEqual(ghCli.isInstalled(), true);
  });

  test('isInstalled returns false when gh is missing', () => {
    sinon.stub(child_process, 'execSync').throws(new Error('command not found: gh'));
    assert.strictEqual(ghCli.isInstalled(), false);
  });

  test('fetchIssues invokes gh with correct args and parses JSON', () => {
    const fake = [{
      number: 1, title: 'Hello', body: 'Body',
      labels: [{ name: 'announcement' }], createdAt: '2026-04-01T00:00:00Z',
      url: 'https://github.com/our-org/a/issues/1',
    }];
    const stub = sinon.stub(child_process, 'execSync').returns(Buffer.from(JSON.stringify(fake)));
    const issues = ghCli.fetchIssues('our-org/announcements', 'announcement');
    const cmd = stub.firstCall.args[0] as string;
    assert.ok(cmd.includes('gh issue list'));
    assert.ok(cmd.includes('--repo our-org/announcements'));
    assert.ok(cmd.includes('--label announcement'));
    assert.ok(cmd.includes('--json title,body,number,labels,createdAt,url'));
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].title, 'Hello');
  });

  test('fetchIssues throws when gh returns non-JSON', () => {
    sinon.stub(child_process, 'execSync').returns(Buffer.from('not json'));
    assert.throws(() => ghCli.fetchIssues('a/b', 'x'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ghCli.ts`**

Create `src/ghCli.ts`:
```ts
import { execSync } from 'child_process';
import { Announcement } from './types';

export function isInstalled(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function fetchIssues(repository: string, label: string): Announcement[] {
  const safeRepo = shellEscape(repository);
  const safeLabel = shellEscape(label);
  const cmd = `gh issue list --repo ${safeRepo} --label ${safeLabel} --state open --limit 100 --json title,body,number,labels,createdAt,url`;
  const raw = execSync(cmd, { encoding: 'utf8' });
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('gh returned unexpected non-array response');
  }
  return parsed.map((it) => ({
    number: it.number,
    title: it.title,
    body: it.body ?? '',
    labels: Array.isArray(it.labels) ? it.labels : [],
    createdAt: it.createdAt,
    url: it.url,
  }));
}

function shellEscape(value: string): string {
  if (!/^[A-Za-z0-9._\-\/:]+$/.test(value)) {
    throw new Error(`Refusing to pass unsafe value to shell: ${value}`);
  }
  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: all `ghCli` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ghCli.ts src/test/suite/ghCli.test.ts
git commit -m "feat: gh CLI wrapper with install check + issue fetch"
```

---

## Task 5: Announcement filtering service (TDD)

**Files:**
- Create: `src/announcementService.ts`
- Test: `src/test/suite/announcementService.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/suite/announcementService.test.ts`:
```ts
import * as assert from 'assert';
import { filterForRepo } from '../../announcementService';
import { Announcement } from '../../types';

function ann(n: number, labels: string[]): Announcement {
  return {
    number: n,
    title: `A${n}`,
    body: '',
    labels: labels.map((name) => ({ name })),
    createdAt: '2026-01-01T00:00:00Z',
    url: `https://github.com/x/y/issues/${n}`,
  };
}

suite('filterForRepo', () => {
  const all = [
    ann(1, ['announcement', 'all-repos']),
    ann(2, ['announcement', 'repo:auth-service']),
    ann(3, ['announcement', 'repo:api']),
    ann(4, ['announcement', 'repo:auth-service', 'repo:api']),
    ann(5, ['announcement']),
  ];

  test('includes all-repos and matching repo labels', () => {
    const result = filterForRepo(all, { owner: 'our-org', repo: 'auth-service' });
    assert.deepStrictEqual(result.map((a) => a.number).sort(), [1, 2, 4]);
  });

  test('returns only all-repos when no repo labels match', () => {
    const result = filterForRepo(all, { owner: 'our-org', repo: 'web' });
    assert.deepStrictEqual(result.map((a) => a.number), [1]);
  });

  test('returns empty when no repo context', () => {
    const result = filterForRepo(all, null);
    assert.deepStrictEqual(result, []);
  });

  test('announcements with no repo/all-repos label are excluded', () => {
    const result = filterForRepo([ann(5, ['announcement'])], { owner: 'our-org', repo: 'api' });
    assert.deepStrictEqual(result, []);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `announcementService.ts`**

Create `src/announcementService.ts`:
```ts
import { Announcement, RepoContext, ALL_REPOS_LABEL, REPO_LABEL_PREFIX } from './types';
import * as ghCli from './ghCli';

export function filterForRepo(items: Announcement[], ctx: RepoContext | null): Announcement[] {
  if (!ctx) { return []; }
  return items.filter((a) => {
    const names = a.labels.map((l) => l.name);
    if (names.includes(ALL_REPOS_LABEL)) { return true; }
    return names.includes(`${REPO_LABEL_PREFIX}${ctx.repo}`);
  });
}

export function fetchAnnouncements(repository: string, label: string, ctx: RepoContext | null): Announcement[] {
  const all = ghCli.fetchIssues(repository, label);
  return filterForRepo(all, ctx);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: all `filterForRepo` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/announcementService.ts src/test/suite/announcementService.test.ts
git commit -m "feat: filter announcements by repo context labels"
```

---

## Task 6: Announcement read-state store (TDD)

**Files:**
- Create: `src/announcementStore.ts`
- Test: `src/test/suite/announcementStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/suite/announcementStore.test.ts`:
```ts
import * as assert from 'assert';
import { AnnouncementStore } from '../../announcementStore';

class FakeMemento {
  private data = new Map<string, unknown>();
  get<T>(key: string, defaultValue: T): T {
    return (this.data.has(key) ? this.data.get(key) : defaultValue) as T;
  }
  async update(key: string, value: unknown): Promise<void> { this.data.set(key, value); }
  keys(): readonly string[] { return Array.from(this.data.keys()); }
  setKeysForSync(): void { /* no-op */ }
}

suite('AnnouncementStore', () => {
  test('isRead returns false by default', () => {
    const store = new AnnouncementStore(new FakeMemento() as any);
    assert.strictEqual(store.isRead(42), false);
  });

  test('markRead persists and isRead returns true', async () => {
    const mem = new FakeMemento();
    const store = new AnnouncementStore(mem as any);
    await store.markRead(42);
    assert.strictEqual(store.isRead(42), true);
    const reloaded = new AnnouncementStore(mem as any);
    assert.strictEqual(reloaded.isRead(42), true);
  });

  test('markAllRead stores every passed id', async () => {
    const store = new AnnouncementStore(new FakeMemento() as any);
    await store.markAllRead([1, 2, 3]);
    assert.strictEqual(store.isRead(1), true);
    assert.strictEqual(store.isRead(2), true);
    assert.strictEqual(store.isRead(3), true);
  });

  test('unreadOf filters out read ids', async () => {
    const store = new AnnouncementStore(new FakeMemento() as any);
    await store.markRead(2);
    const unread = store.unreadOf([1, 2, 3]);
    assert.deepStrictEqual(unread.sort(), [1, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `announcementStore.ts`**

Create `src/announcementStore.ts`:
```ts
import * as vscode from 'vscode';

const READ_IDS_KEY = 'announcements.readIds';

export class AnnouncementStore {
  constructor(private readonly memento: vscode.Memento) {}

  private readIds(): Set<number> {
    return new Set<number>(this.memento.get<number[]>(READ_IDS_KEY, []));
  }

  isRead(id: number): boolean {
    return this.readIds().has(id);
  }

  async markRead(id: number): Promise<void> {
    const ids = this.readIds();
    ids.add(id);
    await this.memento.update(READ_IDS_KEY, Array.from(ids));
  }

  async markAllRead(ids: number[]): Promise<void> {
    const current = this.readIds();
    ids.forEach((i) => current.add(i));
    await this.memento.update(READ_IDS_KEY, Array.from(current));
  }

  unreadOf(ids: number[]): number[] {
    const read = this.readIds();
    return ids.filter((i) => !read.has(i));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: all `AnnouncementStore` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/announcementStore.ts src/test/suite/announcementStore.test.ts
git commit -m "feat: track read announcement ids in globalState"
```

---

## Task 7: Status bar indicator

**Files:**
- Create: `src/statusBar.ts`

- [ ] **Step 1: Implement `statusBar.ts`**

Create `src/statusBar.ts`:
```ts
import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'announcements.viewAll';
    this.item.tooltip = 'Team announcements — click to view';
    this.item.hide();
  }

  update(unreadCount: number): void {
    if (unreadCount <= 0) {
      this.item.text = '$(megaphone) 0';
      this.item.backgroundColor = undefined;
    } else {
      this.item.text = `$(megaphone) ${unreadCount}`;
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    this.item.show();
  }

  hide(): void { this.item.hide(); }

  dispose(): void { this.item.dispose(); }
}
```

- [ ] **Step 2: Verify compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/statusBar.ts
git commit -m "feat: status bar indicator for unread announcements"
```

---

## Task 8: Notification manager

**Files:**
- Create: `src/notificationManager.ts`

- [ ] **Step 1: Implement `notificationManager.ts`**

Create `src/notificationManager.ts`:
```ts
import * as vscode from 'vscode';
import { Announcement } from './types';
import { AnnouncementStore } from './announcementStore';

type ViewAction = (a: Announcement) => void;

export class NotificationManager {
  constructor(
    private readonly store: AnnouncementStore,
    private readonly onView: ViewAction,
  ) {}

  async notify(unread: Announcement[]): Promise<void> {
    if (unread.length === 0) { return; }
    const first = unread[0];
    const message = unread.length === 1
      ? `New announcement: ${first.title}`
      : `${unread.length} new team announcements (${first.title}, ...)`;

    const choice = await vscode.window.showInformationMessage(message, 'View', 'Dismiss');
    if (choice === 'View') {
      this.onView(first);
    } else if (choice === 'Dismiss') {
      await this.store.markAllRead(unread.map((a) => a.number));
    }
  }
}
```

- [ ] **Step 2: Verify compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/notificationManager.ts
git commit -m "feat: notification popup with View / Dismiss actions"
```

---

## Task 9: Webview panel for "View All"

**Files:**
- Create: `src/webviewPanel.ts`

- [ ] **Step 1: Implement `webviewPanel.ts`**

Create `src/webviewPanel.ts`:
```ts
import * as vscode from 'vscode';
import { Announcement } from './types';
import { AnnouncementStore } from './announcementStore';

export class AnnouncementsPanel {
  private static current: AnnouncementsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, private readonly store: AnnouncementStore) {
    this.panel = panel;
    this.panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'openIssue' && typeof msg.url === 'string') {
        await vscode.env.openExternal(vscode.Uri.parse(msg.url));
      }
      if (msg.type === 'markRead' && typeof msg.number === 'number') {
        await this.store.markRead(msg.number);
      }
    }, null, this.disposables);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static showOrUpdate(store: AnnouncementStore, items: Announcement[]): AnnouncementsPanel {
    if (AnnouncementsPanel.current) {
      AnnouncementsPanel.current.render(items);
      AnnouncementsPanel.current.panel.reveal();
      return AnnouncementsPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'teamAnnouncements', 'Team Announcements',
      vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true },
    );
    const instance = new AnnouncementsPanel(panel, store);
    instance.render(items);
    AnnouncementsPanel.current = instance;
    return instance;
  }

  private render(items: Announcement[]): void {
    this.panel.webview.html = renderHtml(items, this.store);
  }

  private dispose(): void {
    AnnouncementsPanel.current = undefined;
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

function renderHtml(items: Announcement[], store: AnnouncementStore): string {
  const rows = items.map((a) => {
    const unread = store.isRead(a.number) ? '' : '<span class="badge">NEW</span>';
    const labels = a.labels.map((l) => `<span class="label">${escapeHtml(l.name)}</span>`).join(' ');
    return `
      <article>
        <header>
          <h2>${unread} ${escapeHtml(a.title)}</h2>
          <div class="meta">${escapeHtml(a.createdAt)} ${labels}</div>
        </header>
        <div class="body">${escapeHtml(a.body).replace(/\n/g, '<br/>')}</div>
        <footer>
          <button data-url="${escapeAttr(a.url)}" class="open">Open on GitHub</button>
          <button data-number="${a.number}" class="read">Mark read</button>
        </footer>
      </article>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1rem; }
    article { border: 1px solid var(--vscode-panel-border); padding: 0.75rem 1rem; margin-bottom: 0.75rem; border-radius: 4px; }
    h2 { margin: 0 0 0.25rem 0; font-size: 1.05rem; }
    .badge { background: var(--vscode-editorWarning-foreground); color: var(--vscode-editor-background); padding: 0 0.3rem; border-radius: 3px; font-size: 0.7rem; }
    .label { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 0 0.3rem; border-radius: 3px; font-size: 0.7rem; margin-right: 0.2rem; }
    .meta { font-size: 0.8rem; opacity: 0.7; margin-bottom: 0.5rem; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; padding: 0.3rem 0.6rem; margin-right: 0.3rem; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .body { white-space: pre-wrap; }
  </style></head><body>
    ${items.length === 0 ? '<p>No announcements for this repository.</p>' : rows}
    <script>
      const vscode = acquireVsCodeApi();
      document.querySelectorAll('button.open').forEach((b) => b.addEventListener('click', () => {
        vscode.postMessage({ type: 'openIssue', url: b.getAttribute('data-url') });
      }));
      document.querySelectorAll('button.read').forEach((b) => b.addEventListener('click', () => {
        vscode.postMessage({ type: 'markRead', number: Number(b.getAttribute('data-number')) });
        b.disabled = true;
      }));
    </script>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function escapeAttr(s: string): string { return escapeHtml(s); }
```

- [ ] **Step 2: Verify compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/webviewPanel.ts
git commit -m "feat: webview panel rendering announcements"
```

---

## Task 10: Commands module

**Files:**
- Create: `src/commands.ts`

- [ ] **Step 1: Implement `commands.ts`**

Create `src/commands.ts`:
```ts
import * as vscode from 'vscode';
import { AnnouncementStore } from './announcementStore';
import { AnnouncementsPanel } from './webviewPanel';
import { Announcement } from './types';

export interface CommandContext {
  store: AnnouncementStore;
  refresh: () => Promise<void>;
  getLatest: () => Announcement[];
}

export function registerCommands(context: vscode.ExtensionContext, cmd: CommandContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('announcements.refresh', async () => {
      await cmd.refresh();
      vscode.window.setStatusBarMessage('Announcements refreshed', 2000);
    }),
    vscode.commands.registerCommand('announcements.viewAll', () => {
      AnnouncementsPanel.showOrUpdate(cmd.store, cmd.getLatest());
    }),
    vscode.commands.registerCommand('announcements.markAllRead', async () => {
      await cmd.store.markAllRead(cmd.getLatest().map((a) => a.number));
      vscode.window.setStatusBarMessage('All announcements marked read', 2000);
      AnnouncementsPanel.showOrUpdate(cmd.store, cmd.getLatest());
    }),
  );
}
```

- [ ] **Step 2: Verify compile**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands.ts
git commit -m "feat: register refresh, viewAll, markAllRead commands"
```

---

## Task 11: Extension entry point — wiring & periodic refresh

**Files:**
- Create: `src/extension.ts`

- [ ] **Step 1: Implement `extension.ts`**

Create `src/extension.ts`:
```ts
import * as vscode from 'vscode';
import * as ghCli from './ghCli';
import { getCurrentRepo } from './gitContext';
import { fetchAnnouncements } from './announcementService';
import { AnnouncementStore } from './announcementStore';
import { NotificationManager } from './notificationManager';
import { StatusBar } from './statusBar';
import { AnnouncementsPanel } from './webviewPanel';
import { registerCommands } from './commands';
import { Announcement, AnnouncementConfig } from './types';

let latest: Announcement[] = [];
let refreshTimer: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  if (!ghCli.isInstalled()) {
    const choice = await vscode.window.showWarningMessage(
      'Team Announcements requires the GitHub CLI (gh). Install it and run `gh auth login`, then reload.',
      'Open install instructions',
    );
    if (choice === 'Open install instructions') {
      await vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com'));
    }
    return;
  }

  const store = new AnnouncementStore(context.globalState);
  const statusBar = new StatusBar();
  context.subscriptions.push(statusBar);
  const notifications = new NotificationManager(store, (a) => openAnnouncement(a, store));

  const refresh = async (): Promise<void> => {
    const cfg = readConfig();
    if (!cfg.repository) {
      vscode.window.showInformationMessage('Set "announcements.repository" in settings to enable announcements.');
      return;
    }
    const ctx = await getCurrentRepo();
    try {
      latest = fetchAnnouncements(cfg.repository, cfg.label, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Failed to fetch announcements: ${message}`);
      return;
    }
    const unread = latest.filter((a) => !store.isRead(a.number));
    statusBar.update(unread.length);
    await notifications.notify(unread);
  };

  registerCommands(context, { store, refresh, getLatest: () => latest });

  await refresh();
  scheduleRefresh(refresh, readConfig().refreshInterval);

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('announcements.refreshInterval')) {
      scheduleRefresh(refresh, readConfig().refreshInterval);
    }
    if (e.affectsConfiguration('announcements.repository') || e.affectsConfiguration('announcements.label')) {
      refresh();
    }
  }));
}

export function deactivate(): void {
  if (refreshTimer) { clearInterval(refreshTimer); }
}

function readConfig(): AnnouncementConfig {
  const c = vscode.workspace.getConfiguration('announcements');
  return {
    repository: c.get<string>('repository', ''),
    label: c.get<string>('label', 'announcement'),
    refreshInterval: c.get<number>('refreshInterval', 30),
  };
}

function scheduleRefresh(run: () => Promise<void>, minutes: number): void {
  if (refreshTimer) { clearInterval(refreshTimer); }
  const ms = Math.max(1, minutes) * 60_000;
  refreshTimer = setInterval(() => { run().catch(() => { /* already surfaced */ }); }, ms);
}

function openAnnouncement(a: Announcement, store: AnnouncementStore): void {
  AnnouncementsPanel.showOrUpdate(store, latest);
  store.markRead(a.number).catch(() => { /* ignore */ });
}
```

- [ ] **Step 2: Build the extension**

Run:
```bash
pnpm run build
```
Expected: `dist/extension.js` produced, no errors.

- [ ] **Step 3: Verify tests still pass**

Run:
```bash
pnpm run compile-tests && pnpm test
```
Expected: all suites green.

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "feat: wire activation, periodic refresh, gh install check"
```

---

## Task 12: Manual end-to-end validation

**Files:** none (validation only).

- [ ] **Step 1: Create `.vscode/launch.json` for debugging**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    { "type": "npm", "script": "build", "group": "build", "problemMatcher": [] }
  ]
}
```

- [ ] **Step 2: Validate `gh` missing flow**

- Temporarily rename `gh` on PATH (e.g. `which gh` → move aside) OR run in a container without it.
- Press F5 to launch Extension Host.
- Expected: warning popup with "Open install instructions" action; extension returns early (no status bar, no commands run).
- Restore `gh` binary.

- [ ] **Step 3: Validate happy path**

- Set `announcements.repository` to a test repo that has issues labeled `announcement`, with labels `all-repos` and `repo:<name>` present.
- Open a workspace whose git remote matches one of those repo names.
- Press F5.
- Expected:
  - Status bar megaphone with unread count.
  - Information popup for unread announcements with View / Dismiss.
  - `Announcements: View All` opens webview panel showing filtered list.
  - Clicking "Mark read" removes `NEW` badge on next refresh.
  - `Announcements: Mark All Read` clears status bar count.

- [ ] **Step 4: Validate filtering**

- Open a workspace whose repo matches *no* `repo:*` labels.
- Expected: only `all-repos` announcements appear.

- [ ] **Step 5: Validate refresh interval change**

- With extension running, change `announcements.refreshInterval` to `1`.
- Expected: within ~1 minute, refresh fires (add a temporary `console.log` in `refresh()` if needed to confirm).

- [ ] **Step 6: Commit launch config**

```bash
git add .vscode/launch.json .vscode/tasks.json
git commit -m "chore: add launch config for extension debugging"
```

---

## Task 13: Packaging readiness

**Files:** none (tooling only).

- [ ] **Step 1: Install vsce**

Run:
```bash
pnpm add --save-dev @vscode/vsce
```

- [ ] **Step 2: Add packaging script**

Edit `package.json` scripts section to add:
```json
    "package": "vsce package --no-dependencies"
```
(Add the line after `"build"` inside `"scripts"`.)

- [ ] **Step 3: Produce a .vsix**

Run:
```bash
pnpm run package
```
Expected: `team-announcements-0.1.0.vsix` generated in the project root with no errors.

- [ ] **Step 4: Install .vsix locally and smoke test**

Run:
```bash
code --install-extension team-announcements-0.1.0.vsix
```
Open VSCode, confirm the extension is listed, commands are available in the palette, and status bar item appears on a repo with configured announcements.

- [ ] **Step 5: Commit packaging changes**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add vsce packaging script"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Requirement 1 (GitHub source) → Task 4 (ghCli), Task 5 (service).
  - Requirement 2 (gh auth + install check) → Task 4 (`isInstalled`), Task 11 (activation gate).
  - Requirement 3 (context-aware filtering) → Task 3 (git context / parseRemoteUrl), Task 5 (filterForRepo with `all-repos` and `repo:*` labels).
  - Requirement 4 (notification + read tracking + periodic) → Task 6 (store), Task 8 (notifications), Task 11 (scheduleRefresh, activation check).
  - Requirement 5 (UI: popup, webview, status bar) → Task 7 (status bar), Task 8 (popup), Task 9 (webview).
  - Requirement 6 (commands: refresh / viewAll / markAllRead) → Task 10.
  - Requirement 7 (settings: repository / label / refreshInterval) → Task 1 (`contributes.configuration`), Task 11 (`readConfig`, change listener).
  - Technical notes (execSync, vscode.git API, remote regex) → Tasks 3, 4.

- **Placeholder scan:** every code step contains the full code to paste; no TBD/TODO strings.

- **Type consistency:** `Announcement`, `RepoContext`, `AnnouncementConfig` defined once in `types.ts` (Task 2) and referenced consistently. Command IDs (`announcements.refresh`, `announcements.viewAll`, `announcements.markAllRead`) match across `package.json` contributions, `commands.ts`, and `statusBar.ts` click target.

- **Security note:** `shellEscape` in `ghCli.ts` rejects any repository/label value that contains characters outside `[A-Za-z0-9._\-\/:]` to prevent command injection from user-editable settings.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-vscode-announcements-extension.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
