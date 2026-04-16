# Design: Convert Classes to Functional Module Style

**Date:** 2026-04-16  
**Scope:** `src/announcementStore.ts`, `src/notificationManager.ts`, `src/statusBar.ts`, `src/webviewPanel.ts`  
**Goal:** Replace class-based patterns with exported functions using module-level state (Option C).

---

## Motivation

Prefer a functional/module style over class syntax. No behavioral changes — the extension works identically after the refactor.

---

## Approach: Module-level state + named exports

Each module owns its mutable state in `let` variables at the top of the file. Callers import and call named functions directly. Singleton behavior is preserved via module scope (modules are loaded once by Node.js).

---

## File-by-file design

### `announcementStore.ts`

**Remove:** `AnnouncementStore` class.

**Add:** module-level `_memento` initialized via `initStore()`:

```ts
let _memento: vscode.Memento

export function initStore(memento: vscode.Memento): void
export function isRead(id: number): boolean
export function markRead(id: number): Promise<void>
export function markAllRead(ids: number[]): Promise<void>
export function unreadOf(ids: number[]): number[]
```

`initStore` is called once in `extension.ts` during `activate()`. All other functions read `_memento` from module scope.

**Test impact:** `new AnnouncementStore(fakeMemento)` in `announcementStore.test.ts` becomes `initStore(fakeMemento)` in `beforeEach`.

---

### `notificationManager.ts`

**Remove:** `NotificationManager` class.

**Add:** single exported function. Since `notify` only needs `markAllRead` from the store (no other mutable state), it imports that directly and drops the `store` dependency from its signature:

```ts
import { markAllRead } from './announcementStore'

export async function notify(unread: Announcement[], onView: ViewAction): Promise<void>
```

Call site in `extension.ts` becomes: `notify(unread, onView)`.

---

### `statusBar.ts`

**Remove:** `StatusBar` class.

**Add:** module-level `_item` with lazy initialization on first `updateStatusBar()` call:

```ts
let _item: vscode.StatusBarItem | undefined

export function updateStatusBar(unreadCount: number): void
export function hideStatusBar(): void
export function disposeStatusBar(): void
```

Lazy init avoids calling VSCode API before extension activation. `_item?.dispose()` guards in hide/dispose handle the case where `updateStatusBar` was never called.

**Call site changes in `extension.ts`:**
- Remove `new StatusBar()`
- `statusBar.update(n)` → `updateStatusBar(n)`
- `statusBar.hide()` → `hideStatusBar()`
- `statusBar.dispose()` → `disposeStatusBar()`

---

### `webviewPanel.ts`

**Remove:** `AnnouncementsPanel` class (static `current` + instance variables).

**Add:** module-level state replacing static+instance split; `dispose()` becomes a non-exported internal function:

```ts
let _panel: vscode.WebviewPanel | undefined
let _disposables: vscode.Disposable[] = []
let _onMarkRead: (() => void) | undefined

export function showOrUpdatePanel(
  store: { markAllRead: (ids: number[]) => Promise<void> },
  items: Announcement[],
  onMarkRead: () => void
): void

function disposePanel(): void  // non-exported, called internally on panel close
```

`renderHtml`, `escapeHtml`, `escapeAttr` are already plain functions — no changes.

**Call site changes in `extension.ts`:**
- `AnnouncementsPanel.showOrUpdate(store, items, onMarkRead)` → `showOrUpdatePanel(store, items, onMarkRead)`

---

## Impact on `extension.ts`

- Import named functions instead of classes
- Call `initStore(context.globalState)` once in `activate()`
- Replace all `store.X()` calls with imported `X()` calls
- Replace `new StatusBar()` / `statusBar.X()` with `updateStatusBar()` / `disposeStatusBar()`
- Replace `new NotificationManager(store, onView).notify(unread)` with `notify(unread, onView)`
- Replace `AnnouncementsPanel.showOrUpdate(...)` with `showOrUpdatePanel(...)`

---

## What stays the same

- All behavior is identical — no logic changes
- `renderHtml`, `escapeHtml`, `escapeAttr` in `webviewPanel.ts` are untouched
- `ghCli.ts`, `gitContext.ts`, `commands.ts`, `types.ts` are untouched
- Test stubs (`vscode-stub.ts`, `mocha-setup.ts`) are untouched
- `FakeMemento` in `announcementStore.test.ts` is untouched

---

## Testing

No new tests needed. Existing `announcementStore.test.ts` adapts to call `initStore(fakeMemento)` instead of constructing a class. The `ghCli` and `gitContext` test suites are unaffected.
