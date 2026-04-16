export const extensions = {
	getExtension: (_id: string) => undefined,
};

export const window = {
	createStatusBarItem: () => ({
		text: "",
		tooltip: "",
		command: "",
		backgroundColor: undefined as unknown,
		show() {
			/* no-op */
		},
		hide() {
			/* no-op */
		},
		dispose() {
			/* no-op */
		},
	}),
	showInformationMessage: async (_message: string, ..._items: string[]) =>
		undefined,
	showWarningMessage: async (_message: string, ..._items: string[]) =>
		undefined,
	showErrorMessage: async (_message: string, ..._items: string[]) => undefined,
	createWebviewPanel: () => ({
		webview: {
			html: "",
			onDidReceiveMessage: () => ({
				dispose() {
					/* no-op */
				},
			}),
			postMessage: async () => false,
		},
		onDidDispose: () => ({
			dispose() {
				/* no-op */
			},
		}),
		reveal() {
			/* no-op */
		},
		dispose() {
			/* no-op */
		},
	}),
	setStatusBarMessage: (_message: string, _timeout?: number) => ({
		dispose() {
			/* no-op */
		},
	}),
};

export const workspace = {
	getConfiguration: (_section: string) => ({
		get: <T>(_key: string, defaultValue: T): T => defaultValue,
	}),
	onDidChangeConfiguration: () => ({
		dispose() {
			/* no-op */
		},
	}),
};

export const commands = {
	registerCommand: () => ({
		dispose() {
			/* no-op */
		},
	}),
};

export const env = {
	openExternal: async () => false,
};

export const Uri = {
	parse: (value: string) => ({ toString: () => value }),
};

export enum StatusBarAlignment {
	Left = 1,
	Right = 2,
}
export enum ViewColumn {
	Active = -1,
	Beside = -2,
	One = 1,
}

export class ThemeColor {
	constructor(public id: string) {}
}
