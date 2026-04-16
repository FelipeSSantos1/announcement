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
