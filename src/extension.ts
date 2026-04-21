import * as vscode from "vscode";
import { initStore, isRead, markRead } from "./announcementStore";
import { registerCommands } from "./commands";
import * as ghCli from "./ghCli";
import { getCurrentRepo, onDidOpenRepository } from "./gitContext";
import { notify } from "./notificationManager";
import { disposeStatusBar, hideStatusBar, updateStatusBar } from "./statusBar";
import type { Announcement, AnnouncementConfig } from "./types";
import { showOrUpdatePanel } from "./webviewPanel";

let latest: Announcement[] = [];
let currentRepoKey: string | null = null;
let refreshTimer: NodeJS.Timeout | undefined;

const STARTUP_DELAY_MS = 30_000;

export function activate(context: vscode.ExtensionContext): void {
	setTimeout(() => {
		initialize(context).catch(() => {});
	}, STARTUP_DELAY_MS);
}

async function initialize(context: vscode.ExtensionContext): Promise<void> {
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

	const repoDisposable = await onDidOpenRepository(() => {
		refresh().catch(() => {});
	});
	if (repoDisposable) {
		context.subscriptions.push(repoDisposable);
	}

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
	markRead(a.number)
		.then(() => showOrUpdatePanel(latest, onMarkRead))
		.catch(() => {
			/* ignore */
		});
}
