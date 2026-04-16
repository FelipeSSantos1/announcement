import * as vscode from "vscode";

export class StatusBar {
	private item: vscode.StatusBarItem;

	constructor() {
		this.item = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100,
		);
		this.item.command = "announcements.viewAll";
		this.item.tooltip = "Team announcements — click to view";
		this.item.hide();
	}

	update(unreadCount: number): void {
		if (unreadCount <= 0) {
			this.item.text = "$(megaphone) 0";
			this.item.backgroundColor = undefined;
		} else {
			this.item.text = `$(megaphone) ${unreadCount}`;
			this.item.backgroundColor = new vscode.ThemeColor(
				"statusBarItem.warningBackground",
			);
		}
		this.item.show();
	}

	hide(): void {
		this.item.hide();
	}

	dispose(): void {
		this.item.dispose();
	}
}
