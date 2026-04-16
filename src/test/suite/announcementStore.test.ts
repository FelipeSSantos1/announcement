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
