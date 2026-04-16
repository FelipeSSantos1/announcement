import * as assert from "assert";
import { AnnouncementStore } from "../../announcementStore";

class FakeMemento {
	private data = new Map<string, unknown>();
	get<T>(key: string, defaultValue: T): T {
		return (this.data.has(key) ? this.data.get(key) : defaultValue) as T;
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
		const store = new AnnouncementStore(new FakeMemento() as any);
		assert.strictEqual(store.isRead(42), false);
	});

	test("markRead persists and isRead returns true", async () => {
		const mem = new FakeMemento();
		const store = new AnnouncementStore(mem as any);
		await store.markRead(42);
		assert.strictEqual(store.isRead(42), true);
		const reloaded = new AnnouncementStore(mem as any);
		assert.strictEqual(reloaded.isRead(42), true);
	});

	test("markAllRead stores every passed id", async () => {
		const store = new AnnouncementStore(new FakeMemento() as any);
		await store.markAllRead([1, 2, 3]);
		assert.strictEqual(store.isRead(1), true);
		assert.strictEqual(store.isRead(2), true);
		assert.strictEqual(store.isRead(3), true);
	});

	test("unreadOf filters out read ids", async () => {
		const store = new AnnouncementStore(new FakeMemento() as any);
		await store.markRead(2);
		const unread = store.unreadOf([1, 2, 3]);
		assert.deepStrictEqual(unread.sort(), [1, 3]);
	});
});
