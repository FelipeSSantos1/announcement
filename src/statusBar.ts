import * as vscode from "vscode";

let _item: vscode.StatusBarItem | undefined;

function getItem(): vscode.StatusBarItem {
	if (!_item) {
		_item = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100,
		);
		_item.command = "announcements.viewAll";
		_item.tooltip = "Team announcements — click to view";
		_item.hide();
	}
	return _item;
}

export function updateStatusBar(unreadCount: number): void {
	const item = getItem();
	if (unreadCount <= 0) {
		item.text = "$(megaphone) 0";
		item.backgroundColor = undefined;
	} else {
		item.text = `$(megaphone) ${unreadCount}`;
		item.backgroundColor = new vscode.ThemeColor(
			"statusBarItem.warningBackground",
		);
	}
	item.show();
}

export function hideStatusBar(): void {
	_item?.hide();
}

export function disposeStatusBar(): void {
	_item?.dispose();
	_item = undefined;
}
