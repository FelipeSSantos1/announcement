import * as vscode from 'vscode';
import { AnnouncementStore } from './announcementStore';
import { AnnouncementsPanel } from './webviewPanel';
import { Announcement } from './types';

export interface CommandContext {
  store: AnnouncementStore;
  refresh: () => Promise<void>;
  getLatest: () => Announcement[];
}

export function registerCommands(context: vscode.ExtensionContext, cmd: CommandContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('announcements.refresh', async () => {
      await cmd.refresh();
      vscode.window.setStatusBarMessage('Announcements refreshed', 2000);
    }),
    vscode.commands.registerCommand('announcements.viewAll', () => {
      AnnouncementsPanel.showOrUpdate(cmd.store, cmd.getLatest());
    }),
    vscode.commands.registerCommand('announcements.markAllRead', async () => {
      await cmd.store.markAllRead(cmd.getLatest().map((a) => a.number));
      vscode.window.setStatusBarMessage('All announcements marked read', 2000);
      AnnouncementsPanel.showOrUpdate(cmd.store, cmd.getLatest());
    }),
  );
}
