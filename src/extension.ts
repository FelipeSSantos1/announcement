import * as vscode from "vscode";
import { AnnouncementStore } from "./announcementStore";
import { registerCommands } from "./commands";
import * as ghCli from "./ghCli";
import { getCurrentRepo } from "./gitContext";
import { NotificationManager } from "./notificationManager";
import { StatusBar } from "./statusBar";
import type { Announcement, AnnouncementConfig } from "./types";
import { AnnouncementsPanel } from "./webviewPanel";

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

	const store = new AnnouncementStore(context.globalState);
	const statusBar = new StatusBar();
	context.subscriptions.push(statusBar);
	const notifications = new NotificationManager(store, (a) =>
		openAnnouncement(a, store),
	);

	const refresh = async (): Promise<void> => {
		const cfg = readConfig();
		const ctx = await getCurrentRepo(
			vscode.window.activeTextEditor?.document.uri,
		);
		if (!ctx) {
			latest = [];
			currentRepoKey = null;
			statusBar.hide();
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
		const unread = latest.filter((a) => !store.isRead(a.number));
		statusBar.update(unread.length);
		await notifications.notify(unread);
	};

	registerCommands(context, { store, refresh, getLatest: () => latest });

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

function openAnnouncement(a: Announcement, store: AnnouncementStore): void {
	AnnouncementsPanel.showOrUpdate(store, latest);
	store.markRead(a.number).catch(() => {
		/* ignore */
	});
}
