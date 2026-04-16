# Class-to-Functions Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four class-based modules with exported functions using module-level state, with no behavioral changes.

**Architecture:** Each module owns its mutable state in `let` variables; consumers import and call named functions directly. Singleton behavior is preserved via Node.js module scope (loaded once). The store functions are imported directly by any module that needs them rather than being passed as a dependency object.

**Tech Stack:** TypeScript 5.3, VSCode Extension API, Mocha + Node assert for tests, pnpm, esbuild.

---

## File Map

| File | Change |
|------|--------|
| `src/announcementStore.ts` | Replace class with module-level `_memento` + exported functions |
| `src/notificationManager.ts` | Replace class with single exported `notify` function |
| `src/statusBar.ts` | Replace class with module-level `_item` + exported functions |
| `src/webviewPanel.ts` | Replace class with module-level panel state + exported `showOrUpdatePanel` |
| `src/extension.ts` | Update all call sites; remove class instantiations |
| `src/commands.ts` | Remove `store` from `CommandContext`; update call sites |
| `src/test/suite/announcementStore.test.ts` | Update tests to use `initStore` instead of `new AnnouncementStore` |

---

## Task 1: Convert `announcementStore.ts` — update tests first

**Files:**
- Modify: `src/test/suite/announcementStore.test.ts`
- Modify: `src/announcementStore.ts`

- [ ] **Step 1: Update the test file to use the new API (tests will fail until implementation changes)**

Replace the entire content of `src/test/suite/announcementStore.test.ts`:

```typescript
import * as assert from "node:assert";
import type * as vscode from "vscode";
import { initStore, isRead, markAllRead, markRead, unreadOf } from "../../announcementStore";

class FakeMemento implements vscode.Memento {
	private data = new Map<string, unknown>();
	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	get<T>(key: string, defaultValue?: T): T | undefined {
		return (this.data.has(key) ? this.data.get(key) : defaultValue) as
			| T
			| undefined;
	}
	async update(key: string, value: unknown): Promise<void> {
		this.data.set(key, value);
	}
	keys(): readonly string[] {
		return Array.from(this.data.keys());
	}
	setKeysForSync(): void {
		/* no-op */
	}
}

suite("AnnouncementStore", () => {
	test("isRead returns false by default", () => {
		initStore(new FakeMemento());
		assert.strictEqual(isRead(42), false);
	});

	test("markRead persists and isRead returns true", async () => {
		const mem = new FakeMemento();
		initStore(mem);
		await markRead(42);
		assert.strictEqual(isRead(42), true);
		initStore(mem);
		assert.strictEqual(isRead(42), true);
	});

	test("markAllRead stores every passed id", async () => {
		initStore(new FakeMemento());
		await markAllRead([1, 2, 3]);
		assert.strictEqual(isRead(1), true);
		assert.strictEqual(isRead(2), true);
		assert.strictEqual(isRead(3), true);
	});

	test("unreadOf filters out read ids", async () => {
		initStore(new FakeMemento());
		await markRead(2);
		const unread = unreadOf([1, 2, 3]);
		assert.deepStrictEqual(unread.sort(), [1, 3]);
	});
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && pnpm test
```

Expected: compilation errors or test failures because `AnnouncementStore` class is still the only export.

- [ ] **Step 3: Replace `src/announcementStore.ts` with module-level functions**

Replace the entire file:

```typescript
import type * as vscode from "vscode";

const READ_IDS_KEY = "announcements.readIds";

let _memento: vscode.Memento;

export function initStore(memento: vscode.Memento): void {
	_memento = memento;
}

function readIds(): Set<number> {
	return new Set<number>(_memento.get<number[]>(READ_IDS_KEY, []));
}

export function isRead(id: number): boolean {
	return readIds().has(id);
}

export async function markRead(id: number): Promise<void> {
	const ids = readIds();
	ids.add(id);
	await _memento.update(READ_IDS_KEY, Array.from(ids));
}

export async function markAllRead(ids: number[]): Promise<void> {
	const current = readIds();
	for (const i of ids) {
		current.add(i);
	}
	await _memento.update(READ_IDS_KEY, Array.from(current));
}

export function unreadOf(ids: number[]): number[] {
	const read = readIds();
	return ids.filter((i) => !read.has(i));
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && pnpm test
```

Expected: all 4 AnnouncementStore tests pass. Other suites (ghCli, gitContext) also pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && git add src/announcementStore.ts src/test/suite/announcementStore.test.ts && git commit -m "refactor: convert AnnouncementStore class to module functions"
```

---

## Task 2: Convert `notificationManager.ts`

**Files:**
- Modify: `src/notificationManager.ts`

No existing tests for this module.

- [ ] **Step 1: Replace `src/notificationManager.ts` with a single exported function**

`notify` imports `markAllRead` directly from the store module instead of receiving a store object:

```typescript
import * as vscode from "vscode";
import { markAllRead } from "./announcementStore";
import type { Announcement } from "./types";

export type ViewAction = (a: Announcement) => void;

export async function notify(
	unread: Announcement[],
	onView: ViewAction,
): Promise<void> {
	if (unread.length === 0) {
		return;
	}
	const first = unread[0];
	const message =
		unread.length === 1
			? `New announcement: ${first.title}`
			: `${unread.length} new team announcements (${first.title}, ...)`;

	const choice = await vscode.window.showInformationMessage(
		message,
		"View",
		"Dismiss",
	);
	if (choice === "View") {
		onView(first);
	} else if (choice === "Dismiss") {
		await markAllRead(unread.map((a) => a.number));
	}
}
```

- [ ] **Step 2: Build to verify no type errors**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && pnpm run build 2>&1 | head -40
```

Expected: build will fail because `extension.ts` still imports `NotificationManager` class. That's fine — we'll fix call sites in Task 6. For now, just confirm the file itself has no internal errors by checking tsc on the file alone:

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && npx tsc --noEmit --skipLibCheck 2>&1 | grep notificationManager
```

Expected: no errors mentioning `notificationManager.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && git add src/notificationManager.ts && git commit -m "refactor: convert NotificationManager class to notify function"
```

---

## Task 3: Convert `statusBar.ts`

**Files:**
- Modify: `src/statusBar.ts`

- [ ] **Step 1: Replace `src/statusBar.ts` with module-level functions**

The item is created lazily inside a private `getItem()` helper on first use:

```typescript
import * as vscode from "vscode";

let _item: vscode.StatusBarItem | undefined;

function getItem(): vscode.StatusBarItem {
	if (!_item) {
		_item = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100,
		);
		_item.command = "announcements.viewAll";
		_item.tooltip = "Team announcements — click to view";
		_item.hide();
	}
	return _item;
}

export function updateStatusBar(unreadCount: number): void {
	const item = getItem();
	if (unreadCount <= 0) {
		item.text = "$(megaphone) 0";
		item.backgroundColor = undefined;
	} else {
		item.text = `$(megaphone) ${unreadCount}`;
		item.backgroundColor = new vscode.ThemeColor(
			"statusBarItem.warningBackground",
		);
	}
	item.show();
}

export function hideStatusBar(): void {
	_item?.hide();
}

export function disposeStatusBar(): void {
	_item?.dispose();
	_item = undefined;
}
```

- [ ] **Step 2: Check for internal type errors**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && npx tsc --noEmit --skipLibCheck 2>&1 | grep statusBar
```

Expected: no errors mentioning `statusBar.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && git add src/statusBar.ts && git commit -m "refactor: convert StatusBar class to module functions"
```

---

## Task 4: Convert `webviewPanel.ts`

**Files:**
- Modify: `src/webviewPanel.ts`

- [ ] **Step 1: Replace `src/webviewPanel.ts` with module-level state and exported function**

`renderHtml` now calls `isRead` directly from the store module instead of receiving a `store` argument. `disposePanel` is non-exported. The `AnnouncementsPanel` class and its static `current` are removed:

```typescript
import * as vscode from "vscode";
import { isRead, markRead } from "./announcementStore";
import type { Announcement } from "./types";

let _panel: vscode.WebviewPanel | undefined;
let _disposables: vscode.Disposable[] = [];
let _items: Announcement[] = [];
let _onMarkRead: (() => void) | undefined;

export function showOrUpdatePanel(
	items: Announcement[],
	onMarkRead?: () => void,
): void {
	if (_panel) {
		_items = items;
		_onMarkRead = onMarkRead;
		_panel.webview.html = renderHtml(items);
		_panel.reveal();
		return;
	}
	const panel = vscode.window.createWebviewPanel(
		"teamAnnouncements",
		"Team Announcements",
		vscode.ViewColumn.One,
		{ enableScripts: true, retainContextWhenHidden: true },
	);
	_panel = panel;
	_items = items;
	_onMarkRead = onMarkRead;

	panel.webview.onDidReceiveMessage(
		async (msg) => {
			if (msg.type === "openIssue" && typeof msg.url === "string") {
				await vscode.env.openExternal(vscode.Uri.parse(msg.url));
			}
			if (msg.type === "markRead" && typeof msg.number === "number") {
				await markRead(msg.number);
				if (_panel) {
					_panel.webview.html = renderHtml(_items);
				}
				_onMarkRead?.();
			}
		},
		null,
		_disposables,
	);
	panel.onDidDispose(() => disposePanel(), null, _disposables);
	panel.webview.html = renderHtml(items);
}

function disposePanel(): void {
	_panel?.dispose();
	_panel = undefined;
	for (const d of _disposables) {
		d.dispose();
	}
	_disposables = [];
}

function renderHtml(items: Announcement[]): string {
	const rows = items
		.map((a) => {
			const unread = isRead(a.number)
				? ""
				: '<span class="badge">NEW</span>';
			const labels = a.labels
				.map((l) => `<span class="label">${escapeHtml(l.name)}</span>`)
				.join(" ");
			return `
      <article>
        <header>
          <h2>${unread} ${escapeHtml(a.title)}</h2>
          <div class="meta">${escapeHtml(a.createdAt)} ${labels}</div>
        </header>
        <div class="body">${escapeHtml(a.body).replace(/\n/g, "<br/>")}</div>
        <footer>
          <button data-url="${escapeAttr(a.url)}" class="open">Open on GitHub</button>
          <button data-number="${a.number}" class="read">Mark read</button>
        </footer>
      </article>`;
		})
		.join("");

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
    ${items.length === 0 ? "<p>No announcements for this repository.</p>" : rows}
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

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function escapeAttr(s: string): string {
	return escapeHtml(s);
}
```

- [ ] **Step 2: Check for internal type errors**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && npx tsc --noEmit --skipLibCheck 2>&1 | grep webviewPanel
```

Expected: no errors mentioning `webviewPanel.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && git add src/webviewPanel.ts && git commit -m "refactor: convert AnnouncementsPanel class to module functions"
```

---

## Task 5: Update `commands.ts`

**Files:**
- Modify: `src/commands.ts`

- [ ] **Step 1: Replace `src/commands.ts` — remove `store` from context, use imported functions**

```typescript
import * as vscode from "vscode";
import { markAllRead } from "./announcementStore";
import type { Announcement } from "./types";
import { showOrUpdatePanel } from "./webviewPanel";

export interface CommandContext {
	refresh: () => Promise<void>;
	getLatest: () => Announcement[];
}

export function registerCommands(
	context: vscode.ExtensionContext,
	cmd: CommandContext,
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand("announcements.refresh", async () => {
			await cmd.refresh();
			vscode.window.setStatusBarMessage("Announcements refreshed", 2000);
		}),
		vscode.commands.registerCommand("announcements.viewAll", () => {
			showOrUpdatePanel(cmd.getLatest());
		}),
		vscode.commands.registerCommand("announcements.markAllRead", async () => {
			await markAllRead(cmd.getLatest().map((a) => a.number));
			vscode.window.setStatusBarMessage("All announcements marked read", 2000);
			showOrUpdatePanel(cmd.getLatest());
		}),
	);
}
```

- [ ] **Step 2: Check for type errors in commands.ts**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && npx tsc --noEmit --skipLibCheck 2>&1 | grep commands
```

Expected: no errors mentioning `commands.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && git add src/commands.ts && git commit -m "refactor: update commands.ts to use module functions"
```

---

## Task 6: Update `extension.ts`

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Replace `src/extension.ts` — remove class instantiations, use module functions**

```typescript
import * as vscode from "vscode";
import { initStore, isRead, markRead } from "./announcementStore";
import { registerCommands } from "./commands";
import * as ghCli from "./ghCli";
import { getCurrentRepo } from "./gitContext";
import { notify } from "./notificationManager";
import { disposeStatusBar, hideStatusBar, updateStatusBar } from "./statusBar";
import type { Announcement, AnnouncementConfig } from "./types";
import { showOrUpdatePanel } from "./webviewPanel";

let latest: Announcement[] = [];
let currentRepoKey: string | null = null;
let refreshTimer: NodeJS.Timeout | undefined;

export async function activate(
	context: vscode.ExtensionContext,
): Promise<void> {
	if (!ghCli.isInstalled()) {
		const choice = await vscode.window.showWarningMessage(
			"Team Announcements requires the GitHub CLI (gh). Install it and run `gh auth login`, then reload.",
			"Open install instructions",
		);
		if (choice === "Open install instructions") {
			await vscode.env.openExternal(vscode.Uri.parse("https://cli.github.com"));
		}
		return;
	}

	initStore(context.globalState);
	context.subscriptions.push({ dispose: disposeStatusBar });

	const refresh = async (): Promise<void> => {
		const cfg = readConfig();
		const ctx = await getCurrentRepo(
			vscode.window.activeTextEditor?.document.uri,
		);
		if (!ctx) {
			latest = [];
			currentRepoKey = null;
			hideStatusBar();
			return;
		}
		currentRepoKey = `${ctx.owner}/${ctx.repo}`;
		try {
			latest = ghCli.fetchIssues(currentRepoKey, cfg.label);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			vscode.window.showErrorMessage(
				`Failed to fetch announcements for ${currentRepoKey}: ${message}`,
			);
			latest = [];
			return;
		}
		const unread = latest.filter((a) => !isRead(a.number));
		updateStatusBar(unread.length);
		await notify(unread, openAnnouncement);
	};

	registerCommands(context, { refresh, getLatest: () => latest });

	await refresh();
	scheduleRefresh(refresh, readConfig().refreshInterval);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("announcements.refreshInterval")) {
				scheduleRefresh(refresh, readConfig().refreshInterval);
			}
			if (e.affectsConfiguration("announcements.label")) {
				refresh();
			}
		}),
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (!editor) {
				return;
			}
			const ctx = await getCurrentRepo(editor.document.uri);
			const key = ctx ? `${ctx.owner}/${ctx.repo}` : null;
			if (key !== currentRepoKey) {
				await refresh();
			}
		}),
	);
}

export function deactivate(): void {
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}
}

function readConfig(): AnnouncementConfig {
	const c = vscode.workspace.getConfiguration("announcements");
	return {
		label: c.get<string>("label", "announcement"),
		refreshInterval: c.get<number>("refreshInterval", 30),
	};
}

function scheduleRefresh(run: () => Promise<void>, minutes: number): void {
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}
	const ms = Math.max(1, minutes) * 60_000;
	refreshTimer = setInterval(() => {
		run().catch(() => {
			/* already surfaced */
		});
	}, ms);
}

function openAnnouncement(a: Announcement): void {
	const onMarkRead = () => {
		const unread = latest.filter((item) => !isRead(item.number));
		updateStatusBar(unread.length);
	};
	showOrUpdatePanel(latest, onMarkRead);
	markRead(a.number).catch(() => {
		/* ignore */
	});
}
```

- [ ] **Step 2: Full type check — all files**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && npx tsc --noEmit --skipLibCheck 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Production build**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && pnpm run build
```

Expected: exits 0, produces `dist/extension.js`.

- [ ] **Step 5: Commit**

```bash
cd /Users/felipe.souzasantos/Documents/HH/vscodeannouncement && git add src/extension.ts && git commit -m "refactor: update extension.ts to use module functions"
```
