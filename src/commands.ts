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
