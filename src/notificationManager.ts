import * as vscode from 'vscode';
import { Announcement } from './types';
import { AnnouncementStore } from './announcementStore';

type ViewAction = (a: Announcement) => void;

export class NotificationManager {
  constructor(
    private readonly store: AnnouncementStore,
    private readonly onView: ViewAction,
  ) {}

  async notify(unread: Announcement[]): Promise<void> {
    if (unread.length === 0) { return; }
    const first = unread[0];
    const message = unread.length === 1
      ? `New announcement: ${first.title}`
      : `${unread.length} new team announcements (${first.title}, ...)`;

    const choice = await vscode.window.showInformationMessage(message, 'View', 'Dismiss');
    if (choice === 'View') {
      this.onView(first);
    } else if (choice === 'Dismiss') {
      await this.store.markAllRead(unread.map((a) => a.number));
    }
  }
}
