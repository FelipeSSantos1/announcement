import type * as vscode from "vscode";

const READ_IDS_KEY = "announcements.readIds";

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
		for (const i of ids) {
			current.add(i);
		}
		await this.memento.update(READ_IDS_KEY, Array.from(current));
	}

	unreadOf(ids: number[]): number[] {
		const read = this.readIds();
		return ids.filter((i) => !read.has(i));
	}
}
