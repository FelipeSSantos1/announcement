import * as vscode from "vscode";
import type { AnnouncementStore } from "./announcementStore";
import type { Announcement } from "./types";

export class AnnouncementsPanel {
	private static current: AnnouncementsPanel | undefined;
	private readonly panel: vscode.WebviewPanel;
	private disposables: vscode.Disposable[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		private readonly store: AnnouncementStore,
	) {
		this.panel = panel;
		this.panel.webview.onDidReceiveMessage(
			async (msg) => {
				if (msg.type === "openIssue" && typeof msg.url === "string") {
					await vscode.env.openExternal(vscode.Uri.parse(msg.url));
				}
				if (msg.type === "markRead" && typeof msg.number === "number") {
					await this.store.markRead(msg.number);
				}
			},
			null,
			this.disposables,
		);
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
	}

	static showOrUpdate(
		store: AnnouncementStore,
		items: Announcement[],
	): AnnouncementsPanel {
		if (AnnouncementsPanel.current) {
			AnnouncementsPanel.current.render(items);
			AnnouncementsPanel.current.panel.reveal();
			return AnnouncementsPanel.current;
		}
		const panel = vscode.window.createWebviewPanel(
			"teamAnnouncements",
			"Team Announcements",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true },
		);
		const instance = new AnnouncementsPanel(panel, store);
		instance.render(items);
		AnnouncementsPanel.current = instance;
		return instance;
	}

	private render(items: Announcement[]): void {
		this.panel.webview.html = renderHtml(items, this.store);
	}

	private dispose(): void {
		AnnouncementsPanel.current = undefined;
		this.panel.dispose();
		for (const d of this.disposables) {
			d.dispose();
		}
		this.disposables = [];
	}
}

function renderHtml(items: Announcement[], store: AnnouncementStore): string {
	const rows = items
		.map((a) => {
			const unread = store.isRead(a.number)
				? ""
				: '<span class="badge">NEW</span>';
			const labels = a.labels
				.map((l) => `<span class="label">${escapeHtml(l.name)}</span>`)
				.join(" ");
			return `
      <article>
        <header>
          <h2>${unread} ${escapeHtml(a.title)}</h2>
          <div class="meta">${escapeHtml(a.createdAt)} ${labels}</div>
        </header>
        <div class="body">${escapeHtml(a.body).replace(/\n/g, "<br/>")}</div>
        <footer>
          <button data-url="${escapeAttr(a.url)}" class="open">Open on GitHub</button>
          <button data-number="${a.number}" class="read">Mark read</button>
        </footer>
      </article>`;
		})
		.join("");

	return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1rem; }
    article { border: 1px solid var(--vscode-panel-border); padding: 0.75rem 1rem; margin-bottom: 0.75rem; border-radius: 4px; }
    h2 { margin: 0 0 0.25rem 0; font-size: 1.05rem; }
    .badge { background: var(--vscode-editorWarning-foreground); color: var(--vscode-editor-background); padding: 0 0.3rem; border-radius: 3px; font-size: 0.7rem; }
    .label { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 0 0.3rem; border-radius: 3px; font-size: 0.7rem; margin-right: 0.2rem; }
    .meta { font-size: 0.8rem; opacity: 0.7; margin-bottom: 0.5rem; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; padding: 0.3rem 0.6rem; margin-right: 0.3rem; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .body { white-space: pre-wrap; }
  </style></head><body>
    ${items.length === 0 ? "<p>No announcements for this repository.</p>" : rows}
    <script>
      const vscode = acquireVsCodeApi();
      document.querySelectorAll('button.open').forEach((b) => b.addEventListener('click', () => {
        vscode.postMessage({ type: 'openIssue', url: b.getAttribute('data-url') });
      }));
      document.querySelectorAll('button.read').forEach((b) => b.addEventListener('click', () => {
        vscode.postMessage({ type: 'markRead', number: Number(b.getAttribute('data-number')) });
        b.disabled = true;
      }));
    </script>
  </body></html>`;
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function escapeAttr(s: string): string {
	return escapeHtml(s);
}
