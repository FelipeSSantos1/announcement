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
